"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import MythCard from "@/components/news/MythCard";
import rawMythsData from "@/data/myths.json";
import type { Myth } from "@/components/news/MythCard";

const mythsData = rawMythsData as Myth[];

type FilterType = "all" | "F1" | "H1B" | "false" | "misleading";

export default function MythBusterPage() {
    const router = useRouter();
    const { profile } = useUser();
    const [filter, setFilter] = useState<FilterType>(profile.visaType ?? "all");
    const [search, setSearch] = useState("");

    const filters: { label: string; value: FilterType }[] = [
        { label: "All", value: "all" },
        { label: "F-1", value: "F1" },
        { label: "H-1B", value: "H1B" },
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
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

            {/* Header */}
            <div>
                <h1 className="text-xl font-semibold text-gray-900">🔍 Myth Buster</h1>
                <p className="text-sm text-gray-500 mt-0.5">Viral claims vs. verified facts</p>
            </div>

            {/* Intro */}
            <div className="bg-purple-50 border border-purple-200 rounded-2xl px-5 py-4">
                <p className="text-purple-700 text-sm leading-relaxed">
                    Scary immigration headlines spread fast. We track the most viral claims
                    and tell you exactly what's true — verified against official government sources only.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: "Myths debunked", value: mythsData.filter((m) => m.verdict === "false").length, color: "text-red-600" },
                    { label: "Misleading claims", value: mythsData.filter((m) => m.verdict === "misleading").length, color: "text-amber-600" },
                    { label: "Total checked", value: mythsData.length, color: "text-blue-600" },
                ].map((s) => (
                    <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-center">
                        <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
                        <p className="text-gray-500 text-xs mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Search */}
            <input
                type="text"
                placeholder="Search myths or headlines..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-blue-400"
            />

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                {filters.map((f) => (
                    <button
                        key={f.value}
                        onClick={() => setFilter(f.value)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f.value
                            ? "bg-purple-600 text-white"
                            : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Cards */}
            <div className="space-y-4">
                {filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <span className="text-4xl">🎉</span>
                        <p className="text-gray-600 font-medium mt-3">No myths found for this filter</p>
                        <p className="text-gray-400 text-sm mt-1">That's a good thing — fewer false claims to worry about</p>
                    </div>
                ) : (
                    filtered.map((myth) => <MythCard key={myth.id} myth={myth} />)
                )}
            </div>

            <p className="text-center text-xs text-gray-400 pb-4">
                All fact-checks verified against official government sources only.
                <br />
                Last updated: March 28, 2026
            </p>
        </div>
    );
}