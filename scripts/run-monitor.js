const { WebsiteMonitor } = require("../lib/website-monitor");
const { summarizeContent } = require("../lib/openai");
// const { EmailService } = require("../lib/email-service");
const fs = require("fs").promises;
const path = require("path");

async function loadConfig() {
  try {
    const configPath = path.join(process.cwd(), "config", "competitors.json");
    const configData = await fs.readFile(configPath, "utf8");
    return JSON.parse(configData);
  } catch (error) {
    console.error("Failed to load config:", error.message);
    console.log("Using default configuration...");
    return {
      competitors: [
        {
          id: "example",
          name: "Example Competitor",
          sources: { websites: ["https://example.com"] },
        },
      ],
      monitoring: { maxWebsitesPerCompetitor: 3 },
    };
  }
}

async function loadExistingSummaries() {
  const summariesFile = path.join(process.cwd(), "data", "summaries.json");
  try {
    const raw = await fs.readFile(summariesFile, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveSummaries(summaries) {
  const summariesFile = path.join(process.cwd(), "data", "summaries.json");
  await fs.writeFile(summariesFile, JSON.stringify(summaries, null, 2));
}

async function processCompetitorWebsites(
  competitor,
  config,
  existingSummaries
) {
  const newSummaries = [];
  const monitor = new WebsiteMonitor();

  if (
    !competitor.sources.websites ||
    competitor.sources.websites.length === 0
  ) {
    console.log(`⚠️  No websites configured for ${competitor.name}`);
    return newSummaries;
  }

  const maxWebsites = config.monitoring.maxWebsitesPerCompetitor || 3;
  const websitesToMonitor = competitor.sources.websites.slice(0, maxWebsites);

  for (const websiteUrl of websitesToMonitor) {
    try {
      console.log(`🌐 Monitoring website: ${websiteUrl}`);

      const changeDetection = await monitor.detectChanges(
        competitor.id,
        websiteUrl
      );

      if (!changeDetection) {
        console.log(`✅ No changes detected on ${websiteUrl}`);
        continue;
      }

      console.log(`🔍 Changes detected on ${websiteUrl}:`);
      changeDetection.changes.forEach((change) => {
        console.log(`   • ${change}`);
      });

      // Create content for AI analysis
      const analysisContent = `
Website: ${websiteUrl}
Changes detected: ${changeDetection.changes.join("; ")}
Current content: ${changeDetection.snapshot.content.content}
Headlines: ${changeDetection.snapshot.content.headlines.join("; ")}
`;

      // Check if we already analyzed this exact change
      const changeHash = require("crypto")
        .createHash("md5")
        .update(analysisContent)
        .digest("hex");
      if (existingSummaries.find((s) => s.changeHash === changeHash)) {
        console.log(`⏭️  Already analyzed this change set`);
        continue;
      }

      console.log(`🤖 Analyzing website changes for ${competitor.name}...`);
      const summary = await summarizeContent(analysisContent, competitor.name);

      const summaryObj = {
        competitorId: competitor.id,
        competitorName: competitor.name,
        title: `Website Update: ${
          changeDetection.snapshot.content.title || "Homepage Changes"
        }`,
        summary,
        source: websiteUrl,
        pubDate: changeDetection.snapshot.timestamp,
        date: new Date().toISOString(),
        sourceType: "website",
        changeType: changeDetection.type,
        changes: changeDetection.changes,
        changeHash,
      };

      newSummaries.push(summaryObj);
      console.log(`✅ Analyzed website changes for ${competitor.name}`);

      // Add delay to avoid overwhelming the target website
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(
        `❌ Failed to monitor website ${websiteUrl}:`,
        error.message
      );
    }
  }

  return newSummaries;
}

async function runWebsiteMonitoring() {
  console.log("🚀 Starting website monitoring...");

  const config = await loadConfig();
  const existingSummaries = await loadExistingSummaries();
  let allNewSummaries = [];

  console.log(
    `🌐 Monitoring websites for ${config.competitors.length} competitors`
  );

  for (const competitor of config.competitors) {
    console.log(`\n🎯 Processing competitor: ${competitor.name}`);

    const newSummaries = await processCompetitorWebsites(
      competitor,
      config,
      existingSummaries
    );
    allNewSummaries = allNewSummaries.concat(newSummaries);
  }

  if (allNewSummaries.length > 0) {
    const updatedSummaries = existingSummaries.concat(allNewSummaries);
    await saveSummaries(updatedSummaries);
    console.log(
      `\n🎉 Website monitoring complete! Found ${allNewSummaries.length} website changes`
    );

    // Show summary of new findings
    console.log("\n📋 Website Changes Summary:");
    allNewSummaries.forEach((summary, index) => {
      console.log(`${index + 1}. [${summary.competitorName}] ${summary.title}`);
      console.log(`   Changes: ${summary.changes.join(", ")}`);
    });

    // Send email notification if enabled
    console.log("\n📧 Checking email notification settings...");
    // const emailService = new EmailService();
    // const emailInitialized = await emailService.initialize();

    // if (emailInitialized) {
    //   await emailService.sendDigestEmail(allNewSummaries, "Website Monitoring");
    // }
  } else {
    console.log("\n📭 No website changes detected across all competitors");

    // Still send email notification for "no updates" if configured
    // const emailService = new EmailService();
    // const emailInitialized = await emailService.initialize();

    // if (emailInitialized) {
    //   const deliveryConfig = await emailService.loadDeliveryConfig();
    //   if (
    //     deliveryConfig.email?.enabled &&
    //     deliveryConfig.email?.sendEmptyDigests
    //   ) {
    //     await emailService.sendDigestEmail([], "Website Monitoring");
    //   }
    // }
  }
}

// Run if called directly
if (require.main === module) {
  runWebsiteMonitoring().catch(console.error);
}

module.exports = { runWebsiteMonitoring };
