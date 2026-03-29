"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AffectBadge from "./AffectBadge";

export type NewsItem = {
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
};

const severityClass = {
    green: "severity-safe",
    yellow: "severity-watch",
    red: "severity-alert",
};

export default function NewsCard({
    item,
    visaType,
    state,
    index = 0,
}: {
    item: NewsItem;
    visaType: string;
    state: string;
    index?: number;
}) {
    const router = useRouter();
    const [expanded, setExpanded] = useState(false);

    const isRelevantState =
        item.affectedStates.includes("all") || item.affectedStates.includes(state);

    return (
        <div
            className={`glass-card ${severityClass[item.severity]} p-5 space-y-4 animate-slide-up`}
            style={{ animationDelay: `${index * 60}ms` }}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span
                            className="text-xs font-semibold uppercase tracking-wider"
                            style={{ color: "var(--accent-calm-light)" }}
                        >
                            {item.source}
                        </span>
                        {item.mythBuster && (
                            <span className="chip chip-active text-xs">
                                🔍 Myth Buster
                            </span>
                        )}
                        {!isRelevantState && (
                            <span className="chip text-xs">
                                Other state
                            </span>
                        )}
                    </div>
                    <h3
                        className="font-semibold leading-snug text-base"
                        style={{ color: "var(--text-primary)" }}
                    >
                        {item.title}
                    </h3>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {item.date}
                    </p>
                </div>
            </div>

            {/* Affect Badge */}
            <AffectBadge severity={item.severity} message={item.affectMessage} />

            {/* Summary */}
            <div>
                <p
                    className={`text-sm leading-relaxed ${!expanded ? "line-clamp-2" : ""}`}
                    style={{ color: "var(--text-secondary)" }}
                >
                    {item.summary}
                </p>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-xs mt-1.5 font-medium transition-colors"
                    style={{ color: "var(--accent-calm-light)" }}
                >
                    {expanded ? "Show less ↑" : "Read more ↓"}
                </button>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                    <span key={tag} className="chip">
                        #{tag}
                    </span>
                ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
                <button
                    onClick={() => router.push(`/chatbot?newsId=${item.id}`)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{
                        background: "var(--accent-calm-glow)",
                        color: "var(--accent-calm-light)",
                        border: "1px solid hsla(168, 55%, 42%, 0.2)",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "hsla(168, 55%, 42%, 0.2)";
                        e.currentTarget.style.borderColor = "hsla(168, 55%, 42%, 0.35)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "var(--accent-calm-glow)";
                        e.currentTarget.style.borderColor = "hsla(168, 55%, 42%, 0.2)";
                    }}
                >
                    💬 Ask AI about this
                </button>
                <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass-btn px-4 py-2.5 text-sm font-medium flex items-center gap-1"
                    style={{ color: "var(--text-secondary)" }}
                >
                    Source ↗
                </a>
            </div>
        </div>
    );
}