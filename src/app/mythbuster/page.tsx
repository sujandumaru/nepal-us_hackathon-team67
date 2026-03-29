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
        { label: "✕ False", value: "false" },
        { label: "⚡ Misleading", value: "misleading" },
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
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-24">

            {/* Header */}
            <div className="animate-float-in">
                <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                    🔍 Myth Buster
                </h1>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Viral claims vs. verified facts
                </p>
            </div>

            {/* Intro */}
            <div
                className="glass-card px-5 py-4 animate-float-in stagger-1"
                style={{
                    borderColor: "hsla(270, 50%, 50%, 0.15)",
                    background: "hsla(270, 50%, 50%, 0.04)",
                }}
            >
                <p className="text-sm leading-relaxed" style={{ color: "hsl(270, 50%, 72%)" }}>
                    Scary immigration headlines spread fast. We track the most viral claims
                    and tell you exactly what&apos;s true — verified against official government sources only.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: "Myths debunked", value: mythsData.filter((m) => m.verdict === "false").length, color: "hsl(0, 60%, 65%)" },
                    { label: "Misleading claims", value: mythsData.filter((m) => m.verdict === "misleading").length, color: "hsl(38, 80%, 65%)" },
                    { label: "Total checked", value: mythsData.length, color: "var(--accent-calm-light)" },
                ].map((s, i) => (
                    <div
                        key={s.label}
                        className={`glass-card-sm px-4 py-3.5 text-center animate-float-in stagger-${i + 2}`}
                    >
                        <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="animate-float-in stagger-3">
                <input
                    type="text"
                    placeholder="Search myths or headlines..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-4 py-3 text-sm rounded-xl"
                />
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap animate-float-in stagger-4">
                {filters.map((f) => (
                    <button
                        key={f.value}
                        onClick={() => setFilter(f.value)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300`}
                        style={filter === f.value ? {
                            background: "hsla(270, 50%, 50%, 0.15)",
                            border: "1px solid hsla(270, 50%, 50%, 0.3)",
                            color: "hsl(270, 50%, 75%)",
                        } : {
                            background: "var(--glass-bg)",
                            border: "1px solid var(--glass-border)",
                            color: "var(--text-secondary)",
                        }}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Cards */}
            <div className="space-y-4">
                {filtered.length === 0 ? (
                    <div className="text-center py-16 animate-float-in">
                        <span className="text-4xl">🎉</span>
                        <p className="font-medium mt-3" style={{ color: "var(--text-primary)" }}>
                            No myths found for this filter
                        </p>
                        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                            That&apos;s a good thing — fewer false claims to worry about
                        </p>
                    </div>
                ) : (
                    filtered.map((myth, i) => <MythCard key={myth.id} myth={myth} index={i} />)
                )}
            </div>

            <p className="text-center text-xs pb-4" style={{ color: "var(--text-muted)" }}>
                All fact-checks verified against official government sources only.
                <br />
                Last updated: March 28, 2026
            </p>
        </div>
    );
}