const { fetchLatestArticles } = require("../lib/rss");
const { summarizeContent } = require("../lib/openai");
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
          id: "mozilla",
          name: "Mozilla",
          sources: { rss: ["https://blog.mozilla.org/feed/"] },
        },
      ],
      monitoring: { maxArticlesPerSource: 5 },
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

async function processCompetitorRSS(competitor, config, existingSummaries) {
  const newSummaries = [];

  if (!competitor.sources.rss || competitor.sources.rss.length === 0) {
    console.log(`⚠️  No RSS feeds configured for ${competitor.name}`);
    return newSummaries;
  }

  for (const rssUrl of competitor.sources.rss) {
    try {
      console.log(`📡 Fetching RSS feed for ${competitor.name}: ${rssUrl}`);
      const articles = await fetchLatestArticles(
        rssUrl,
        config.monitoring.maxArticlesPerSource || 5
      );

      for (const article of articles) {
        // Check if article already summarized (by link)
        if (existingSummaries.find((s) => s.source === article.link)) {
          console.log(`⏭️  Skipping already summarized: ${article.title}`);
          continue;
        }

        console.log(`🤖 Analyzing: ${article.title}`);
        const summary = await summarizeContent(
          article.content,
          competitor.name
        );

        const summaryObj = {
          competitorId: competitor.id,
          competitorName: competitor.name,
          title: article.title,
          summary,
          source: article.link,
          pubDate: article.pubDate,
          date: new Date().toISOString(),
          sourceType: "rss",
        };

        newSummaries.push(summaryObj);
        console.log(`✅ Summarized: ${article.title}`);

        // Add small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`❌ Failed to process RSS feed ${rssUrl}:`, error.message);
    }
  }

  return newSummaries;
}

async function runDigest() {
  console.log("🚀 Starting competitor intelligence digest...");

  const config = await loadConfig();
  const existingSummaries = await loadExistingSummaries();
  let allNewSummaries = [];

  console.log(`📊 Monitoring ${config.competitors.length} competitors`);

  for (const competitor of config.competitors) {
    console.log(`\n🎯 Processing competitor: ${competitor.name}`);

    const newSummaries = await processCompetitorRSS(
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
      `\n🎉 Digest complete! Added ${allNewSummaries.length} new summaries`
    );

    // Show summary of new findings
    console.log("\n📋 New Intelligence Summary:");
    allNewSummaries.forEach((summary, index) => {
      console.log(`${index + 1}. [${summary.competitorName}] ${summary.title}`);
    });

    // // Send email notification if enabled
    // console.log("\n📧 Checking email notification settings...");
    // const emailService = new EmailService();
    // const emailInitialized = await emailService.initialize();

    // if (emailInitialized) {
    //   await emailService.sendDigestEmail(allNewSummaries, "Daily");
    // }
  } else {
    console.log("\n📭 No new content found across all competitors");

    // // Still send email notification for "no updates" if configured
    // const emailService = new EmailService();
    // const emailInitialized = await emailService.initialize();

    // if (emailInitialized) {
    //   const deliveryConfig = await emailService.loadDeliveryConfig();
    //   if (
    //     deliveryConfig.email?.enabled &&
    //     deliveryConfig.email?.sendEmptyDigests
    //   ) {
    //     await emailService.sendDigestEmail([], "Daily");
    //   }
    // }
  }
}

// Run if called directly
if (require.main === module) {
  runDigest().catch(console.error);
}

module.exports = { runDigest };
