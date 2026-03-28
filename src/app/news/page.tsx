"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import NewsCard, { NewsItem } from "@/components/news/NewsCard";

type FeedState = "loading" | "live" | "curated" | "error";

export default function NewsPage() {
    const { profile } = useUser();
    const router = useRouter();

    const [articles, setArticles] = useState<NewsItem[]>([]);
    const [feedState, setFeedState] = useState<FeedState>("loading");
    const [filter, setFilter] = useState<"relevant" | "all">("relevant");

    useEffect(() => {
        if (!profile.visaType) {
            router.push("/onboarding");
            return;
        }
        loadNews();
    }, [profile.visaType]);

    async function loadNews() {
        setFeedState("loading");
        try {
            const res = await fetch("/api/news");
            if (!res.ok) throw new Error("fetch failed");
            const data = await res.json();
            setArticles(data.articles ?? []);
            setFeedState(data.source === "live" ? "live" : "curated");
        } catch {
            // Network totally failed — show empty with error state
            setArticles([]);
            setFeedState("error");
        }
    }

    if (!profile.visaType) return null;

    const relevantArticles = articles.filter((n) =>
        n.affectedVisas.includes(profile.visaType!)
    );
    const displayArticles = filter === "relevant" ? relevantArticles : articles;
    const redCount = displayArticles.filter((n) => n.severity === "red").length;

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-gray-900">Immigration updates</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{profile.visaType} · {profile.state}</p>
                </div>

                {/* Source badge */}
                {feedState === "live" && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                        Live from USCIS &amp; DHS
                    </span>
                )}
                {feedState === "curated" && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
                        Verified updates
                    </span>
                )}
            </div>

            {/* Loading skeleton */}
            {feedState === "loading" && (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3 animate-pulse">
                            <div className="h-3 bg-gray-100 rounded w-1/4" />
                            <div className="h-4 bg-gray-100 rounded w-3/4" />
                            <div className="h-3 bg-gray-100 rounded w-1/2" />
                            <div className="h-8 bg-gray-100 rounded-lg" />
                        </div>
                    ))}
                    <p className="text-center text-sm text-gray-400 pt-2">
                        Fetching latest updates and classifying with AI...
                    </p>
                </div>
            )}

            {/* Error state */}
            {feedState === "error" && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">⚠️</span>
                    <div>
                        <p className="text-amber-800 font-medium text-sm">Could not load live updates</p>
                        <p className="text-amber-600 text-xs mt-0.5 mb-3">Check your connection or try again.</p>
                        <button
                            onClick={loadNews}
                            className="text-xs text-amber-700 border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            )}

            {/* Main feed */}
            {(feedState === "live" || feedState === "curated") && (
                <>
                    {/* Urgent alert banner */}
                    {redCount > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                            <span className="text-xl flex-shrink-0">🚨</span>
                            <div>
                                <p className="text-red-700 font-medium text-sm">
                                    {redCount} urgent update{redCount > 1 ? "s" : ""} require your attention
                                </p>
                                <p className="text-red-500 text-xs mt-0.5">Review the red-flagged items below</p>
                            </div>
                        </div>
                    )}

                    {/* How it works — only shown for live feed */}
                    {feedState === "live" && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex gap-3 items-start">
                            <span className="text-base flex-shrink-0 mt-0.5">🤖</span>
                            <p className="text-xs text-blue-700 leading-relaxed">
                                These articles were pulled directly from USCIS and DHS and classified by AI —
                                green, yellow, and red badges show how each update affects your {profile.visaType} status.
                            </p>
                        </div>
                    )}

                    {/* Filter tabs */}
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setFilter("relevant")}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === "relevant"
                                    ? "bg-blue-600 text-white"
                                    : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
                                }`}
                        >
                            My updates ({relevantArticles.length})
                        </button>
                        <button
                            onClick={() => setFilter("all")}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === "all"
                                    ? "bg-blue-600 text-white"
                                    : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
                                }`}
                        >
                            All updates ({articles.length})
                        </button>
                        <button
                            onClick={() => router.push("/mythbuster")}
                            className="ml-auto px-4 py-2 rounded-xl text-sm font-medium bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 transition-all"
                        >
                            🔍 Myth Buster
                        </button>
                    </div>

                    {/* News cards */}
                    <div className="space-y-4">
                        {displayArticles.length === 0 ? (
                            <div className="text-center py-16">
                                <span className="text-4xl">✅</span>
                                <p className="text-gray-600 font-medium mt-3">No updates affecting you right now</p>
                                <p className="text-gray-400 text-sm mt-1">
                                    {filter === "relevant"
                                        ? "Switch to 'All updates' to see everything"
                                        : "Check back later — we'll flag anything important"}
                                </p>
                            </div>
                        ) : (
                            displayArticles.map((item) => (
                                <NewsCard
                                    key={item.id}
                                    item={item}
                                    visaType={profile.visaType!}
                                    state={profile.state!}
                                />
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="text-center text-xs text-gray-400 pb-4 space-y-1">
                        {feedState === "live" ? (
                            <p>Live data from USCIS.gov and DHS.gov · AI-classified by Claude</p>
                        ) : (
                            <p>Verified updates sourced from official government websites</p>
                        )}
                        <p>Not legal advice · Consult an attorney for your specific situation</p>
                    </div>
                </>
            )}
        </div>
    );
}