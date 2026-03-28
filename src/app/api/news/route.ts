import { NextRequest, NextResponse } from "next/server";
import curatedNews from "@/data/news.json";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LiveNewsItem = {
    id: string;
    title: string;
    source: string;
    sourceUrl: string;
    date: string;
    summary: string;
    affectedVisas: string[];
    affectedStates: string[];
    severity: "green" | "yellow" | "red";
    affectMessage: string;
    mythBuster: boolean;
    tags: string[];
    isLive: boolean; // flag so the UI can show a "Live" badge
};

type RssItem = {
    title: string;
    link: string;
    description: string;
    pubDate: string;
};

type ClaudeClassification = {
    severity: "green" | "yellow" | "red";
    affectedVisas: string[];
    affectMessage: string;
    tags: string[];
    relevant: boolean; // false = skip this article entirely
};

// ─── RSS sources ──────────────────────────────────────────────────────────────
// rss2json.com is a public RSS-to-JSON relay that bypasses government site
// restrictions on direct programmatic RSS access.

const RSS_SOURCES = [
    {
        name: "USCIS",
        // USCIS all-news RSS
        rssUrl: "https://www.uscis.gov/newsroom/all-news",
    },
    {
        name: "DHS",
        // DHS newsroom RSS
        rssUrl: "https://feeds.feedburner.com/homelandsecuritynewswire/rss",
    },
];

const RSS2JSON_BASE = "https://api.rss2json.com/v1/api.json";
const MAX_ARTICLES_PER_SOURCE = 8; // keep AI batch small
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MOCK_MODE = !OPENROUTER_API_KEY;
const MODEL = "google/gemini-2.0-flash-exp:free";
const RSS2JSON_KEY = process.env.RSS2JSON_API_KEY ?? "";

// No caching — fetch fresh on every request (on demand)

// ─── Fetch RSS via rss2json relay ────────────────────────────────────────────

async function fetchRssItems(source: { name: string; rssUrl: string }): Promise<RssItem[]> {
    try {
        const apiKeyParam = RSS2JSON_KEY ? `&api_key=${RSS2JSON_KEY}` : "";
        const url = `${RSS2JSON_BASE}?rss_url=${encodeURIComponent(source.rssUrl)}&count=${MAX_ARTICLES_PER_SOURCE}${apiKeyParam}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return [];

        const data = await res.json();
        if (data.status !== "ok" || !Array.isArray(data.items)) return [];

        return data.items.map((item: Record<string, string>) => ({
            title: item.title ?? "",
            link: item.link ?? "",
            // Strip HTML tags from description
            description: (item.description ?? item.content ?? "").replace(/<[^>]+>/g, "").slice(0, 400),
            pubDate: item.pubDate ?? "",
        }));
    } catch {
        return [];
    }
}

// ─── Classify articles with Claude ───────────────────────────────────────────

async function classifyWithClaude(
    articles: { title: string; summary: string; source: string }[]
): Promise<ClaudeClassification[]> {
    if (MOCK_MODE || articles.length === 0) {
        // Return a safe mock classification for each article
        return articles.map(() => ({
            severity: "green" as const,
            affectedVisas: ["F1", "H1B"],
            affectMessage: "Review this update",
            tags: ["immigration"],
            relevant: true,
        }));
    }

    const articleList = articles
        .map((a, i) => `[${i}] SOURCE: ${a.source}\nTITLE: ${a.title}\nSUMMARY: ${a.summary}`)
        .join("\n\n");

    const systemPrompt = `You are an immigration news classifier for a US visa holder app focused on Nepali immigrants on F-1 student and H-1B work visas.

For each article, return ONLY a valid JSON array (no markdown, no explanation) where each element has:
- "relevant": boolean — true only if this article affects F-1 or H-1B visa holders in any meaningful way. Set to false for unrelated topics (e.g. border enforcement, family immigration, TPS for other countries, naturalization fraud).
- "severity": "green" (informational, no action needed) | "yellow" (worth monitoring, minor action possible) | "red" (urgent, action required or significant risk)
- "affectedVisas": array containing "F1" and/or "H1B" depending on who is affected
- "affectMessage": a short, calm 6-10 word message like "No changes to F-1 OPT this year" or "H-1B holders should check before traveling"
- "tags": array of 2-4 lowercase keyword strings like ["opt", "f1", "processing-times"]

Be calm and reassuring. Do not exaggerate severity. Only mark red if there is a concrete, immediate risk.
Return exactly ${articles.length} objects in the array, in the same order as input.`;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://immicalm.app",
                "X-Title": "ImmiCalm",
            },
            body: JSON.stringify({
                model: MODEL,
                max_tokens: 1000,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: articleList },
                ],
            }),
        });

        const data = await response.json();
        const text: string = data.choices?.[0]?.message?.content ?? "[]";

        // Strip any accidental markdown fences
        const clean = text.replace(/```json|```/g, "").trim();
        const parsed: ClaudeClassification[] = JSON.parse(clean);

        // Safety: ensure array length matches
        if (!Array.isArray(parsed) || parsed.length !== articles.length) {
            throw new Error("Unexpected AI response length");
        }
        return parsed;
    } catch {
        // On any error fall back to safe defaults
        return articles.map(() => ({
            severity: "green" as const,
            affectedVisas: ["F1", "H1B"],
            affectMessage: "Check this update for details",
            tags: ["immigration"],
            relevant: true,
        }));
    }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
    try {
        // 1. Fetch RSS from all sources in parallel
        const rssResults = await Promise.all(RSS_SOURCES.map(fetchRssItems));

        // 2. Flatten and tag with source name
        const allItems: { title: string; summary: string; source: string; link: string; pubDate: string }[] = [];
        RSS_SOURCES.forEach((src, i) => {
            rssResults[i].forEach((item) => {
                allItems.push({
                    title: item.title,
                    summary: item.description,
                    source: src.name,
                    link: item.link,
                    pubDate: item.pubDate,
                });
            });
        });

        // 3. If we got no live articles, return curated fallback immediately
        if (allItems.length === 0) {
            return NextResponse.json({
                articles: curatedNews.map((n) => ({ ...n, isLive: false })),
                source: "curated",
            });
        }

        // 4. Classify all articles with Claude in one batch
        const classifications = await classifyWithClaude(
            allItems.map((a) => ({ title: a.title, summary: a.summary, source: a.source }))
        );

        // 5. Merge RSS data with Claude classifications, filter irrelevant
        const liveArticles: LiveNewsItem[] = allItems
            .map((item, i): LiveNewsItem | null => {
                const cls = classifications[i];
                if (!cls || !cls.relevant) return null;

                return {
                    id: `live-${i}-${Date.now()}`,
                    title: item.title,
                    source: item.source,
                    sourceUrl: item.link,
                    date: item.pubDate
                        ? new Date(item.pubDate).toISOString().split("T")[0]
                        : new Date().toISOString().split("T")[0],
                    summary: item.summary,
                    affectedVisas: cls.affectedVisas ?? ["F1", "H1B"],
                    affectedStates: ["all"],
                    severity: cls.severity ?? "green",
                    affectMessage: cls.affectMessage ?? "Check this update",
                    mythBuster: false,
                    tags: cls.tags ?? ["immigration"],
                    isLive: true,
                };
            })
            .filter((a): a is LiveNewsItem => a !== null);

        // 6. If Claude filtered everything out (all irrelevant), fall back to curated
        if (liveArticles.length === 0) {
            return NextResponse.json({
                articles: curatedNews.map((n) => ({ ...n, isLive: false })),
                source: "curated",
            });
        }

        // 7. Return live articles, sorted newest first
        const sorted = liveArticles.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        return NextResponse.json({ articles: sorted, source: "live" });

    } catch {
        // Any unhandled error → serve curated fallback
        return NextResponse.json({
            articles: curatedNews.map((n) => ({ ...n, isLive: false })),
            source: "curated",
        });
    }
}