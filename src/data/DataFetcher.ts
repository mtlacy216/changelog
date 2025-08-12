export interface FeedData {
  items: unknown[];
  last_fetched_at: string;
}

const CACHE_KEY = 'rss_feed_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  timestamp: number;
  data: FeedData;
}

function loadCache(): Record<string, CacheEntry> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, CacheEntry>): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

/**
 * Fetch multiple RSS feeds with caching and batching.
 * Stale feeds (older than 24h) are fetched from the network while
 * fresh feeds are returned from localStorage.
 * The request sends last_fetched_at for each feed so the server can
 * skip unchanged feeds.
 */
export async function fetchRSSFeeds(feeds: string[]): Promise<Record<string, FeedData>> {
  const now = Date.now();
  const cache = loadCache();
  const result: Record<string, FeedData> = {};

  const stale: string[] = [];
  const lastFetched: Record<string, string> = {};

  for (const feed of feeds) {
    const entry = cache[feed];
    if (entry && now - entry.timestamp < CACHE_TTL) {
      result[feed] = entry.data;
      lastFetched[feed] = entry.data.last_fetched_at;
    } else {
      stale.push(feed);
      if (entry) {
        lastFetched[feed] = entry.data.last_fetched_at;
      }
    }
  }

  if (stale.length) {
    const resp = await fetch('/rss_feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feeds: stale, last_fetched_at: lastFetched }),
    });
    const data: Record<string, FeedData> = await resp.json();
    for (const feed of stale) {
      const feedData = data[feed];
      if (feedData) {
        cache[feed] = { timestamp: now, data: feedData };
        result[feed] = feedData;
      }
    }
    saveCache(cache);
  }

  return result;
}
