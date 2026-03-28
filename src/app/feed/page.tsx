"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import NewsCard, { NewsItem } from "@/components/news/NewsCard";
import MoodCheckin from "@/components/MoodCheckin";
import newsData from "@/data/news.json";

export default function FeedPage() {
    const { profile } = useUser();
    const router = useRouter();
    const [filter, setFilter] = useState<"all" | "relevant">("relevant");

    // Redirect if no profile set
    useEffect(() => {
        if (!profile.visaType) router.push("/onboarding");
    }, [profile, router]);

    if (!profile.visaType) return null;

    // Filter news based on profile
    const filteredNews = (newsData as NewsItem[]).filter((item) => {
        if (filter === "all") return true;
        return item.affectedVisas.includes(profile.visaType!);
    });

    const redCount = filteredNews.filter((i) => i.severity === "red").length;

    return (
        <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-black">ImmiCalm 🕊️</h1>
                    <p className="text-gray-500 text-sm">
                        {profile.visaType} · {profile.state}
                    </p>
                </div>
                <button
                    onClick={() => router.push("/onboarding")}
                    className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-3 py-1.5 rounded-lg"
                >
                    Change profile
                </button>
            </div>

            {/* Alert Banner if urgent news */}
            {redCount > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <p className="text-red-400 font-semibold text-sm">
                            {redCount} urgent update{redCount > 1 ? "s" : ""} require your attention
                        </p>
                        <p className="text-red-400/70 text-xs">
                            Review the red-flagged items below
                        </p>
                    </div>
                </div>
            )}

            {/* Mood Check-in */}
            <MoodCheckin />

            {/* Filter Tabs */}
            <div className="flex gap-2">
                {(["relevant", "all"] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f
                            ? "bg-blue-600 text-white"
                            : "bg-gray-900 text-gray-400 hover:bg-gray-800"
                            }`}
                    >
                        {f === "relevant"
                            ? `My Updates (${filteredNews.length})`
                            : `All Updates (${newsData.length})`}
                    </button>
                ))}
                <button
                    onClick={() => router.push("/mythbuster")}
                    className="ml-auto px-4 py-2 rounded-xl text-sm font-medium bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600/30 transition-all"
                >
                    🔍 Myth Buster
                </button>
            </div>

            {/* News Cards */}
            <div className="space-y-4">
                {filteredNews.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <p className="text-4xl mb-3">✅</p>
                        <p className="font-medium">No updates affecting you right now</p>
                        <p className="text-sm mt-1">Check back later — we'll flag anything important</p>
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
            <div className="text-center text-xs text-gray-600 pb-4">
                All updates sourced from official government websites only.
                <br />
                This is not legal advice. Consult an attorney for your specific situation.
            </div>

        </div>
    );
}