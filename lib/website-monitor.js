const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");

class WebsiteMonitor {
  constructor() {
    this.snapshotsDir = path.join(process.cwd(), "data", "snapshots");
    this.ensureSnapshotsDir();
    this.userAgents = [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
    ];
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 seconds
  }

  async ensureSnapshotsDir() {
    try {
      await fs.mkdir(this.snapshotsDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create snapshots directory:", error);
    }
  }

  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async takeSnapshot(url, competitorId) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      let browser;
      try {
        console.log(`📸 Attempt ${attempt}/${this.maxRetries} for ${url}`);

        browser = await puppeteer.launch({
          headless: "new",
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-blink-features=AutomationControlled",
            "--disable-features=VizDisplayCompositor",
            "--disable-extensions",
            "--disable-plugins",
            "--disable-images", // Speed up loading
            "--disable-javascript", // Avoid complex JS that might detect bots
            "--user-agent=" + this.getRandomUserAgent(),
          ],
        });

        const page = await browser.newPage();

        // Set viewport and user agent
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent(this.getRandomUserAgent());

        // Set additional headers to look more like a real browser
        await page.setExtraHTTPHeaders({
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate",
          DNT: "1",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        });

        // Navigate with shorter timeout and different wait strategy
        await page.goto(url, {
          waitUntil: "domcontentloaded", // Less strict than networkidle2
          timeout: 20000, // Shorter timeout
        });

        // Wait a bit for dynamic content
        await this.sleep(2000);

        // Extract key content areas
        const content = await page.evaluate(() => {
          // Remove scripts, styles, and other non-content elements
          const elementsToRemove = document.querySelectorAll(
            "script, style, nav, footer, aside, .cookie-banner, .popup"
          );
          elementsToRemove.forEach((el) => el.remove());

          // Get main content areas
          const mainContent = document.querySelector(
            "main, .main, #main, .content, #content, article, .article"
          );
          const headlines = Array.from(
            document.querySelectorAll("h1, h2, h3")
          ).map((h) => h.textContent.trim());
          const paragraphs = Array.from(document.querySelectorAll("p"))
            .slice(0, 10)
            .map((p) => p.textContent.trim());

          return {
            title: document.title,
            url: window.location.href,
            headlines: headlines.filter((h) => h.length > 0),
            content: mainContent
              ? mainContent.textContent.trim().slice(0, 2000)
              : "",
            paragraphs: paragraphs.filter((p) => p.length > 20),
          };
        });

        const snapshot = {
          url,
          competitorId,
          timestamp: new Date().toISOString(),
          content,
          hash: this.generateContentHash(content),
        };

        console.log(`✅ Successfully captured snapshot for ${url}`);
        return snapshot;
      } catch (error) {
        console.error(
          `❌ Attempt ${attempt} failed for ${url}:`,
          error.message
        );

        if (attempt === this.maxRetries) {
          console.error(`🚫 All ${this.maxRetries} attempts failed for ${url}`);
          return null;
        }

        // Wait before retrying with exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await this.sleep(delay);
      } finally {
        if (browser) {
          await browser.close();
        }
      }
    }

    // If we get here, all retries failed
    return null;
  }

  async takeSimpleSnapshot(url, competitorId) {
    try {
      console.log(`🌐 Attempting simple HTTP request for ${url}`);

      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          "User-Agent": this.getRandomUserAgent(),
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate",
          DNT: "1",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = response.data;

      // Simple HTML parsing to extract basic content
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : "No title found";

      // Extract headings (simplified)
      const headingMatches =
        html.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi) || [];
      const headlines = headingMatches
        .map((h) => h.replace(/<[^>]+>/g, "").trim())
        .filter((h) => h.length > 0)
        .slice(0, 10);

      // Extract some text content (simplified)
      const textContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 2000);

      const content = {
        title,
        url,
        headlines,
        content: textContent,
        paragraphs: [], // Not extracting paragraphs in simple mode
      };

      const snapshot = {
        url,
        competitorId,
        timestamp: new Date().toISOString(),
        content,
        hash: this.generateContentHash(content),
        method: "simple_http",
      };

      console.log(`✅ Simple snapshot captured for ${url}`);
      return snapshot;
    } catch (error) {
      console.error(`❌ Simple snapshot failed for ${url}:`, error.message);
      return null;
    }
  }

  generateContentHash(content) {
    const contentString = JSON.stringify(content);
    return crypto.createHash("md5").update(contentString).digest("hex");
  }

  async saveSnapshot(snapshot) {
    const filename = `${snapshot.competitorId}_${Date.now()}.json`;
    const filepath = path.join(this.snapshotsDir, filename);
    await fs.writeFile(filepath, JSON.stringify(snapshot, null, 2));
    return filepath;
  }

  async getLastSnapshot(competitorId, url) {
    try {
      const files = await fs.readdir(this.snapshotsDir);
      const competitorFiles = files
        .filter((f) => f.startsWith(competitorId) && f.endsWith(".json"))
        .sort()
        .reverse();

      for (const file of competitorFiles) {
        const filepath = path.join(this.snapshotsDir, file);
        const snapshot = JSON.parse(await fs.readFile(filepath, "utf8"));
        if (snapshot.url === url) {
          return snapshot;
        }
      }
    } catch (error) {
      console.error("Error reading snapshots:", error);
    }
    return null;
  }

  async detectChanges(competitorId, url) {
    // Try Puppeteer first, then fallback to simple HTTP
    let newSnapshot = await this.takeSnapshot(url, competitorId);

    if (!newSnapshot) {
      console.log(
        `🔄 Puppeteer failed, trying simple HTTP fallback for ${url}`
      );
      newSnapshot = await this.takeSimpleSnapshot(url, competitorId);
    }

    if (!newSnapshot) {
      console.log(`🚫 All methods failed for ${url}`);
      return null;
    }

    const lastSnapshot = await this.getLastSnapshot(competitorId, url);

    if (!lastSnapshot) {
      // First time monitoring this URL
      await this.saveSnapshot(newSnapshot);
      return {
        type: "new",
        snapshot: newSnapshot,
        changes: ["Initial monitoring setup for this URL"],
      };
    }

    if (newSnapshot.hash === lastSnapshot.hash) {
      // No changes detected
      return null;
    }

    // Changes detected - save new snapshot and analyze differences
    await this.saveSnapshot(newSnapshot);

    const changes = this.analyzeChanges(
      lastSnapshot.content,
      newSnapshot.content
    );

    return {
      type: "changed",
      snapshot: newSnapshot,
      previousSnapshot: lastSnapshot,
      changes,
    };
  }

  analyzeChanges(oldContent, newContent) {
    const changes = [];

    // Compare titles
    if (oldContent.title !== newContent.title) {
      changes.push(
        `Title changed: "${oldContent.title}" → "${newContent.title}"`
      );
    }

    // Compare headlines
    const oldHeadlines = new Set(oldContent.headlines);
    const newHeadlines = new Set(newContent.headlines);

    const addedHeadlines = [...newHeadlines].filter(
      (h) => !oldHeadlines.has(h)
    );
    const removedHeadlines = [...oldHeadlines].filter(
      (h) => !newHeadlines.has(h)
    );

    if (addedHeadlines.length > 0) {
      changes.push(`New headlines: ${addedHeadlines.join(", ")}`);
    }
    if (removedHeadlines.length > 0) {
      changes.push(`Removed headlines: ${removedHeadlines.join(", ")}`);
    }

    // Simple content change detection
    if (oldContent.content !== newContent.content) {
      const contentDiff = Math.abs(
        oldContent.content.length - newContent.content.length
      );
      if (contentDiff > 100) {
        changes.push(
          `Significant content changes detected (${contentDiff} character difference)`
        );
      } else {
        changes.push("Minor content updates detected");
      }
    }

    return changes.length > 0
      ? changes
      : ["Content structure or formatting changes detected"];
  }
}

module.exports = { WebsiteMonitor };
