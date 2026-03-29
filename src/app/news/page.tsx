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
    const sortedAllNews = [...allNews].sort((a, b) => {
        if (a.severity === "red" && b.severity !== "red") return -1;
        if (a.severity !== "red" && b.severity === "red") return 1;
        if (a.severity === "yellow" && b.severity === "green") return -1;
        if (a.severity === "green" && b.severity === "yellow") return 1;
        return 0;
    });
    const relevantNews = sortedAllNews.filter((n) => n.affectedVisas.includes(profile.visaType!));
    const filteredNews = filter === "relevant" ? relevantNews : sortedAllNews;
    const redCount = filteredNews.filter((n) => n.severity === "red").length;

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-24">

            {/* Header */}
            <div className="animate-float-in">
                <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                    Immigration updates
                </h1>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {profile.visaType} · {profile.state || "All states"}
                </p>
            </div>

            {/* Urgent alert banner */}
            {redCount > 0 && (
                <div
                    className="glass-card px-4 py-3.5 flex items-center gap-3 animate-float-in"
                    style={{
                        borderColor: "hsla(0, 60%, 55%, 0.3)",
                        boxShadow: "0 0 24px -8px hsla(0, 60%, 55%, 0.15), inset 0 0 24px -12px hsla(0, 60%, 55%, 0.08)",
                    }}
                >
                    <span className="text-xl flex-shrink-0">⚠️</span>
                    <div>
                        <p className="font-medium text-sm" style={{ color: "hsl(0, 60%, 65%)" }}>
                            {redCount} urgent update{redCount > 1 ? "s" : ""} require your attention
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "hsl(0, 50%, 55%)" }}>
                            Review the red-flagged items below
                        </p>
                    </div>
                </div>
            )}

            {/* Filter tabs */}
            <div className="flex gap-2 flex-wrap animate-float-in stagger-1">
                <button
                    onClick={() => setFilter("relevant")}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${filter === "relevant" ? "btn-primary" : "glass-btn"}`}
                    style={filter !== "relevant" ? { color: "var(--text-secondary)" } : {}}
                >
                    My updates ({relevantNews.length})
                </button>
                <button
                    onClick={() => setFilter("all")}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${filter === "all" ? "btn-primary" : "glass-btn"}`}
                    style={filter !== "all" ? { color: "var(--text-secondary)" } : {}}
                >
                    All updates ({allNews.length})
                </button>
                <button
                    onClick={() => router.push("/mythbuster")}
                    className="ml-auto glass-btn px-4 py-2 rounded-xl text-sm font-medium"
                    style={{
                        color: "hsl(270, 50%, 72%)",
                        borderColor: "hsla(270, 50%, 50%, 0.2)",
                        background: "hsla(270, 50%, 50%, 0.06)",
                    }}
                >
                    🔍 Myth Buster
                </button>
            </div>

            {/* News cards */}
            <div className="space-y-4">
                {filteredNews.length === 0 ? (
                    <div className="text-center py-16 animate-float-in">
                        <span className="text-4xl">✅</span>
                        <p className="font-medium mt-3" style={{ color: "var(--text-primary)" }}>
                            No updates affecting you right now
                        </p>
                        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                            Check back later — we&apos;ll flag anything important
                        </p>
                    </div>
                ) : (
                    filteredNews.map((item, i) => (
                        <NewsCard
                            key={item.id}
                            item={item}
                            visaType={profile.visaType!}
                            state={profile.state ?? ""}
                            index={i}
                        />
                    ))
                )}
            </div>

            {/* Footer */}
            <p className="text-center text-xs pb-4" style={{ color: "var(--text-muted)" }}>
                All updates sourced from official government websites only.
                <br />
                Not legal advice. Consult an attorney for your specific situation.
            </p>
        </div>
    );
}