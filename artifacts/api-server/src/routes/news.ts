import { Router } from "express";
import Parser from "rss-parser";

const router = Router();
const parser = new Parser({
  timeout: 8000,
  headers: { "User-Agent": "SmartFX/1.0 (market news aggregator)" },
});

const FEEDS = [
  { url: "https://feeds.reuters.com/reuters/businessNews", source: "Reuters", category: "Business" },
  { url: "https://feeds.marketwatch.com/marketwatch/marketpulse/", source: "MarketWatch", category: "Markets" },
  { url: "https://www.fxstreet.com/rss/news", source: "FXStreet", category: "Forex" },
  { url: "https://www.investing.com/rss/news_301.rss", source: "Investing.com", category: "Markets" },
  { url: "https://www.forexlive.com/feed/news", source: "ForexLive", category: "Forex" },
];

// Keywords that signal a major market-moving event
const MAJOR_KEYWORDS = [
  "federal reserve", "fed ", " fed ", "fomc", "central bank",
  "ecb", "bank of england", "boe", "bank of japan", "boj",
  "interest rate", "rate hike", "rate cut", "rate decision",
  "gdp", "cpi", "inflation", "deflation",
  "nfp", "non-farm", "nonfarm", "payroll",
  "unemployment", "jobs report", "labor",
  "recession", "crisis", "default", "collapse",
  "tariff", "sanctions", "trade war",
  "stimulus", "quantitative easing", "qe", "taper",
  "treasury", "bond yield", "yield curve",
  "emergency", "bank failure", "bailout",
  "war", "geopolitical", "nuclear",
  "oil price", "opec",
  "powell", "lagarde", "yellen", "draghi",
  "gdp growth", "economic data", "pmi",
];

function classifyImpact(title: string, description: string): "major" | "minor" {
  const text = `${title} ${description}`.toLowerCase();
  const score = MAJOR_KEYWORDS.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
  return score >= 1 ? "major" : "minor";
}

interface NewsItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  category: string;
  publishedAt: string;
  impact: "major" | "minor";
  imageUrl?: string;
}

let cache: { items: NewsItem[]; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchFeed(feed: typeof FEEDS[0]): Promise<NewsItem[]> {
  try {
    const result = await parser.parseURL(feed.url);
    return (result.items || []).slice(0, 15).map((item, i) => {
      const title = item.title?.trim() || "No title";
      const description =
        item.contentSnippet?.slice(0, 200).trim() ||
        item.summary?.slice(0, 200).trim() ||
        "";
      return {
        id: `${feed.source}-${i}-${Date.now()}`,
        title,
        description,
        url: item.link || "#",
        source: feed.source,
        category: feed.category,
        publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
        impact: classifyImpact(title, description),
        imageUrl: (item as any).enclosure?.url || undefined,
      };
    });
  } catch {
    return [];
  }
}

router.get("/", async (_req, res) => {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return res.json({ items: cache.items, cached: true });
  }

  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const all: NewsItem[] = [];

  results.forEach((r) => {
    if (r.status === "fulfilled") all.push(...r.value);
  });

  all.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  cache = { items: all, fetchedAt: Date.now() };
  res.json({ items: all, cached: false });
});

export default router;
