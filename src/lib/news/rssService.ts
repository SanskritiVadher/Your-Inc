import { prisma } from "@/lib/prisma";
import { XMLParser } from "fast-xml-parser";

export const DEFAULT_RSS_FEEDS = [
  {
    name: "The Hindu - Business",
    url: "https://www.thehindu.com/business/feeder/default.rss",
    category: "Business",
  },
  {
    name: "The Hindu - Economy",
    url: "https://www.thehindu.com/business/Economy/feeder/default.rss",
    category: "Economy",
  },
  {
    name: "The Hindu - Industry",
    url: "https://www.thehindu.com/business/Industry/feeder/default.rss",
    category: "Industry",
  },
  {
    name: "The Hindu - Markets",
    url: "https://www.thehindu.com/business/markets/feeder/default.rss",
    category: "Markets",
  },
];

export interface FormattedNewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  link: string;
  pubDate: string;
  subjectCode: string;
  topicName: string;
  whyItMatters: string;
  gdQuestion: string;
  interviewQuestion: string;
  isSaved?: boolean;
}

/**
 * Strips HTML tags and excessive whitespace from RSS descriptions.
 * Never scrapes full articles; preserves summary only.
 */
function cleanRssSummary(rawHtml: string): string {
  if (!rawHtml) return "";
  let text = rawHtml
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();

  // Keep summary concise (max 320 chars if very long)
  if (text.length > 320) {
    const periodIdx = text.indexOf(".", 180);
    if (periodIdx !== -1 && periodIdx < 320) {
      text = text.substring(0, periodIdx + 1);
    } else {
      text = text.substring(0, 317) + "...";
    }
  }
  return text;
}

/**
 * AI Layer: Derives subject tag, MBA relevance, GD question, and Interview question
 * strictly from the headline and RSS summary without inventing external facts.
 */
function analyzeNewsItem(title: string, summary: string): {
  subjectCode: string;
  topicName: string;
  whyItMatters: string;
  gdQuestion: string;
  interviewQuestion: string;
} {
  const combined = `${title} ${summary}`.toLowerCase();

  // Macroeconomics / Trade / Monetary Policy
  if (
    combined.includes("export") ||
    combined.includes("import") ||
    combined.includes("trade") ||
    combined.includes("deficit") ||
    combined.includes("gdp") ||
    combined.includes("inflation") ||
    combined.includes("rbi") ||
    combined.includes("repo") ||
    combined.includes("monetary") ||
    combined.includes("currency") ||
    combined.includes("fiscal") ||
    combined.includes("tax") ||
    combined.includes("rupee")
  ) {
    return {
      subjectCode: "ECO601",
      topicName: "Macroeconomics & Trade Dynamics",
      whyItMatters: `Shifts in trade and macroeconomic policy directly determine corporate borrowing costs, working capital margins, and currency hedging strategies.`,
      gdQuestion: `Does India's export growth trajectory reflect structural manufacturing competitiveness or temporary commodity price tailwinds?`,
      interviewQuestion: `Walk me through how a 100 bps change in trade balance affects domestic liquidity, bond yields, and capital goods sector valuations.`,
    };
  }

  // Capital Markets / Banking / Corporate Finance
  if (
    combined.includes("stock") ||
    combined.includes("share") ||
    combined.includes("sensex") ||
    combined.includes("nifty") ||
    combined.includes("ipo") ||
    combined.includes("sebi") ||
    combined.includes("bank") ||
    combined.includes("bond") ||
    combined.includes("yield") ||
    combined.includes("pe") ||
    combined.includes("debt") ||
    combined.includes("equity") ||
    combined.includes("valuation") ||
    combined.includes("fund") ||
    combined.includes("investor")
  ) {
    return {
      subjectCode: "FIN601",
      topicName: "Capital Markets & Valuation",
      whyItMatters: `Capital market movements and regulatory interventions dictate cost of equity (Ke), corporate restructuring windows, and exit multiples for financial sponsors.`,
      gdQuestion: `Are current equity market valuations pricing in realistic earnings growth across mid-cap industrials?`,
      interviewQuestion: `If you were CFO evaluating an IPO versus private credit in this interest rate environment, what 3 hurdle criteria would guide your decision?`,
    };
  }

  // Operations / Supply Chain / Infrastructure
  if (
    combined.includes("supply") ||
    combined.includes("logistics") ||
    combined.includes("freight") ||
    combined.includes("manufacturing") ||
    combined.includes("factory") ||
    combined.includes("plant") ||
    combined.includes("capacity") ||
    combined.includes("semiconductor") ||
    combined.includes("auto") ||
    combined.includes("steel") ||
    combined.includes("port") ||
    combined.includes("infra") ||
    combined.includes("power") ||
    combined.includes("energy")
  ) {
    return {
      subjectCode: "OPM503",
      topicName: "Operations & Supply Chain Strategy",
      whyItMatters: `Bottlenecks and capacity expansions directly impact throughput velocity, supply chain resiliency, and operating leverage.`,
      gdQuestion: `Can localized supply chains match the cost efficiencies of global centralized procurement hubs?`,
      interviewQuestion: `How would you optimize inventory turnover ratios when faced with sudden freight volatility without compromising fulfillment SLA?`,
    };
  }

  // Marketing / Consumer / Retail / Tech
  if (
    combined.includes("consumer") ||
    combined.includes("retail") ||
    combined.includes("fmcg") ||
    combined.includes("brand") ||
    combined.includes("e-commerce") ||
    combined.includes("customer") ||
    combined.includes("sales") ||
    combined.includes("digital") ||
    combined.includes("ai") ||
    combined.includes("tech") ||
    combined.includes("app") ||
    combined.includes("telecom")
  ) {
    return {
      subjectCode: "MKT502",
      topicName: "Consumer Demand & Go-To-Market",
      whyItMatters: `Consumer sentiment and digital distribution shifts govern Customer Acquisition Cost (CAC), Lifetime Value (LTV), and market share retention.`,
      gdQuestion: `Is premiumization in urban retail masking demand slowdowns in rural and tier-2 markets?`,
      interviewQuestion: `How would you design a pricing elasticity model to pass on raw material inflation without eroding brand equity?`,
    };
  }

  // Default: Corporate Strategy
  return {
    subjectCode: "STR601",
    topicName: "Corporate Strategy & Governance",
    whyItMatters: `Industry reorganizations and regulatory shifts redefine competitive moats, barrier-to-entry dynamics, and capital allocation priorities.`,
    gdQuestion: `Should corporations prioritize diversification or double down on core competencies during macroeconomic uncertainty?`,
    interviewQuestion: `Evaluate this development through Porter's Five Forces: which stakeholder group gains the most pricing power?`,
  };
}

/**
 * Ensures the 4 default RSS feeds exist in database.
 */
export async function ensureDefaultFeeds() {
  for (const def of DEFAULT_RSS_FEEDS) {
    await prisma.newsFeed.upsert({
      where: { url: def.url },
      update: { name: def.name, category: def.category },
      create: {
        name: def.name,
        url: def.url,
        category: def.category,
        isActive: true,
      },
    });
  }
}

/**
 * Fetches RSS feeds server-side every 3 hours, caches in DB.
 * If a feed fails, returns cached items with "Updated X hours ago" — never errors.
 */
export async function syncNewsFeeds(force = false): Promise<{
  updatedCount: number;
  lastUpdated: Date;
  isStale: boolean;
}> {
  await ensureDefaultFeeds();

  const feeds = await prisma.newsFeed.findMany({
    where: { isActive: true },
  });

  const now = new Date();
  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
  let totalNewItems = 0;
  let isStale = false;

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  for (const feed of feeds) {
    const isDue =
      force ||
      !feed.lastFetchedAt ||
      now.getTime() - feed.lastFetchedAt.getTime() > THREE_HOURS_MS;

    if (!isDue) {
      continue;
    }

    try {
      const response = await fetch(feed.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) YouInc/1.0",
          Accept: "application/rss+xml, application/xml, text/xml",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        console.warn(`[RSS] Failed to fetch feed ${feed.url}: status ${response.status}`);
        isStale = true;
        continue;
      }

      const xmlText = await response.text();
      const parsed = parser.parse(xmlText);
      const rawItems = parsed?.rss?.channel?.item;

      if (!rawItems) {
        continue;
      }

      const itemsArray = Array.isArray(rawItems) ? rawItems : [rawItems];

      for (const item of itemsArray) {
        const title = cleanRssSummary(item.title || "");
        const summary = cleanRssSummary(item.description || "");
        const link = (item.link || item.guid || "").trim();

        if (!title || !link) continue;

        const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

        // Check if item already exists
        const existing = await prisma.newsItem.findUnique({
          where: { link },
        });

        if (!existing) {
          const aiAnalysis = analyzeNewsItem(title, summary);

          await prisma.newsItem.create({
            data: {
              feedId: feed.id,
              title,
              summary,
              source: "The Hindu",
              link,
              pubDate,
              subjectCode: aiAnalysis.subjectCode,
              topicName: aiAnalysis.topicName,
              whyItMatters: aiAnalysis.whyItMatters,
              gdQuestion: aiAnalysis.gdQuestion,
              interviewQuestion: aiAnalysis.interviewQuestion,
            },
          });
          totalNewItems++;
        }
      }

      // Update feed lastFetchedAt
      await prisma.newsFeed.update({
        where: { id: feed.id },
        data: { lastFetchedAt: now },
      });
    } catch (err) {
      console.warn(`[RSS] Error parsing feed ${feed.url}:`, err);
      isStale = true;
    }
  }

  // Get most recent timestamp from NewsItem or fallback to now
  const latestItem = await prisma.newsItem.findFirst({
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  return {
    updatedCount: totalNewItems,
    lastUpdated: latestItem?.createdAt || now,
    isStale,
  };
}

/**
 * Gets cached news items with user saved status, subject filters, and search.
 */
export async function getCachedNewsItems(params: {
  userId?: string;
  subjectCode?: string;
  source?: string;
  limit?: number;
  offset?: number;
  onlySaved?: boolean;
}) {
  const { userId, subjectCode, source, limit = 20, offset = 0, onlySaved = false } = params;

  // Auto-sync if DB has no items or cache is stale
  const count = await prisma.newsItem.count();
  if (count === 0) {
    await syncNewsFeeds(true);
  }

  const where: any = {};

  if (subjectCode && subjectCode !== "all") {
    where.subjectCode = subjectCode;
  }

  if (source && source !== "all") {
    where.source = source;
  }

  if (onlySaved && userId) {
    where.savedBy = {
      some: { userId },
    };
  }

  const [items, totalCount, latestFetchedFeed] = await Promise.all([
    prisma.newsItem.findMany({
      where,
      orderBy: { pubDate: "desc" },
      take: limit,
      skip: offset,
      include: {
        savedBy: userId ? { where: { userId } } : false,
      },
    }),
    prisma.newsItem.count({ where }),
    prisma.newsFeed.findFirst({
      where: { lastFetchedAt: { not: null } },
      orderBy: { lastFetchedAt: "desc" },
      select: { lastFetchedAt: true },
    }),
  ]);

  const lastUpdated = latestFetchedFeed?.lastFetchedAt || new Date();
  const hoursAgo = Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / (3600 * 1000)));
  const updatedLabel = hoursAgo === 0 ? "Updated just now" : `Updated ${hoursAgo} ${hoursAgo === 1 ? "hour" : "hours"} ago`;

  const formattedItems: FormattedNewsItem[] = items.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    source: item.source,
    link: item.link,
    pubDate: item.pubDate.toISOString(),
    subjectCode: item.subjectCode || "GENERAL",
    topicName: item.topicName || "Corporate Strategy",
    whyItMatters: item.whyItMatters || "Strategic impact on business performance and sector margins.",
    gdQuestion: item.gdQuestion || "How does this development alter competitive dynamics in the sector?",
    interviewQuestion: item.interviewQuestion || "Walk through the financial implications of this policy shift.",
    isSaved: Boolean(item.savedBy && item.savedBy.length > 0),
  }));

  return {
    items: formattedItems,
    totalCount,
    lastUpdated: lastUpdated.toISOString(),
    updatedLabel,
  };
}
