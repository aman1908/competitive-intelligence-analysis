const Parser = require('rss-parser')

const parser = new Parser()
async function fetchLatestArticles(rssUrl, limit = 5) {
  const feed = await parser.parseURL(rssUrl);
  return feed.items.slice(0, limit).map((item) => ({
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    content: item.contentSnippet || "",
  }));
}

module.exports = { fetchLatestArticles };
