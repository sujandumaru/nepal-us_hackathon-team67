"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import NewsCard, { NewsItem } from "@/components/news/NewsCard";
import newsData from "@/data/news.json";

export default function NewsPage() {
    const { profile } = useUser();
    const router = useRouter();
    const [filter, setFilter] = useState<"relevant" | "all">("relevant");

    useEffect(() => {
        if (!profile.visaType) router.push("/onboarding");
    }, [profile, router]);

    if (!profile.visaType) return null;

    const allNews = newsData as NewsItem[];
    const relevantNews = allNews.filter((n) => n.affectedVisas.includes(profile.visaType!));
    const filteredNews = filter === "relevant" ? relevantNews : allNews;
    const redCount = filteredNews.filter((n) => n.severity === "red").length;

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

            {/* Header */}
            <div>
                <h1 className="text-xl font-semibold text-gray-900">Immigration updates</h1>
                <p className="text-sm text-gray-500 mt-0.5">{profile.visaType} · {profile.state}</p>
            </div>

            {/* Urgent alert banner */}
            {redCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <span className="text-xl flex-shrink-0">⚠️</span>
                    <div>
                        <p className="text-red-700 font-medium text-sm">
                            {redCount} urgent update{redCount > 1 ? "s" : ""} require your attention
                        </p>
                        <p className="text-red-500 text-xs mt-0.5">Review the red-flagged items below</p>
                    </div>
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
                    My updates ({relevantNews.length})
                </button>
                <button
                    onClick={() => setFilter("all")}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === "all"
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
                        }`}
                >
                    All updates ({allNews.length})
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
                {filteredNews.length === 0 ? (
                    <div className="text-center py-16">
                        <span className="text-4xl">✅</span>
                        <p className="text-gray-600 font-medium mt-3">No updates affecting you right now</p>
                        <p className="text-gray-400 text-sm mt-1">Check back later — we'll flag anything important</p>
                    </div>
                ) : (
                    filteredNews.map((item) => (
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
            <p className="text-center text-xs text-gray-400 pb-4">
                All updates sourced from official government websites only.
                <br />
                Not legal advice. Consult an attorney for your specific situation.
            </p>
        </div>
    );
}