"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import MythCard from "@/components/news/MythCard";
import mythsData from "@/data/myths.json";

type FilterType = "all" | "F1" | "H1B" | "false" | "misleading";

export default function MythBusterPage() {
    const router = useRouter();
    const { profile } = useUser();
    const [filter, setFilter] = useState<FilterType>(
        profile.visaType ?? "all"
    );
    const [search, setSearch] = useState("");

    const filters: { label: string; value: FilterType }[] = [
        { label: "All", value: "all" },
        { label: "F1", value: "F1" },
        { label: "H1B", value: "H1B" },
        { label: "❌ False", value: "false" },
        { label: "⚠️ Misleading", value: "misleading" },
    ];

    const filtered = mythsData.filter((myth) => {
        const matchesFilter =
            filter === "all" ||
            myth.affectedVisas.includes(filter) ||
            myth.verdict === filter;

        const matchesSearch =
            search === "" ||
            myth.claim.toLowerCase().includes(search.toLowerCase()) ||
            myth.viralHeadline.toLowerCase().includes(search.toLowerCase());

        return matchesFilter && matchesSearch;
    });

    return (
        <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    ← Back
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white">🔍 Myth Buster</h1>
                    <p className="text-gray-500 text-sm">
                        Viral claims vs. verified facts
                    </p>
                </div>
            </div>

            {/* Intro Banner */}
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl px-5 py-4">
                <p className="text-purple-300 text-sm leading-relaxed">
                    Scary immigration headlines spread fast. We track the most viral
                    claims and tell you exactly what's true — verified against official
                    government sources only.
                </p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    {
                        label: "Myths Debunked",
                        value: mythsData.filter((m) => m.verdict === "false").length,
                        color: "text-red-400",
                    },
                    {
                        label: "Misleading Claims",
                        value: mythsData.filter((m) => m.verdict === "misleading").length,
                        color: "text-yellow-400",
                    },
                    {
                        label: "Total Checked",
                        value: mythsData.length,
                        color: "text-blue-400",
                    },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-center"
                    >
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Search */}
            <input
                type="text"
                placeholder="Search myths or headlines..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                {filters.map((f) => (
                    <button
                        key={f.value}
                        onClick={() => setFilter(f.value)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f.value
                                ? "bg-purple-600 text-white"
                                : "bg-gray-900 text-gray-400 hover:bg-gray-800"
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Myth Cards */}
            <div className="space-y-4">
                {filtered.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <p className="text-4xl mb-3">🎉</p>
                        <p className="font-medium">No myths found for this filter</p>
                        <p className="text-sm mt-1">
                            That's a good thing — fewer false claims to worry about
                        </p>
                    </div>
                ) : (
                    filtered.map((myth) => (
                        <MythCard key={myth.id} myth={myth} />
                    ))
                )}
            </div>

            {/* Footer Note */}
            <div className="text-center text-xs text-gray-600 pb-4">
                All fact-checks are verified against official government sources only.
                <br />
                Last updated: March 28, 2026
            </div>

        </div>
    );
}