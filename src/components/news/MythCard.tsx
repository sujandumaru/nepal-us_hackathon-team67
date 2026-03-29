"use client";

import { useState } from "react";

export type Myth = {
    id: string;
    claim: string;
    verdict: "false" | "misleading" | "true";
    explanation: string;
    source: string;
    sourceUrl: string;
    date: string;
    affectedVisas: string[];
    viralHeadline: string;
};

const verdictConfig = {
    false: {
        label: "FALSE",
        gradient: "linear-gradient(135deg, hsla(0, 60%, 55%, 0.15), hsla(0, 60%, 45%, 0.05))",
        border: "hsla(0, 60%, 55%, 0.25)",
        text: "hsl(0, 60%, 65%)",
        icon: "✕",
        iconBg: "hsla(0, 60%, 55%, 0.15)",
    },
    misleading: {
        label: "MISLEADING",
        gradient: "linear-gradient(135deg, hsla(38, 80%, 55%, 0.15), hsla(38, 80%, 45%, 0.05))",
        border: "hsla(38, 80%, 55%, 0.25)",
        text: "hsl(38, 80%, 65%)",
        icon: "⚡",
        iconBg: "hsla(38, 80%, 55%, 0.15)",
    },
    true: {
        label: "TRUE",
        gradient: "linear-gradient(135deg, hsla(152, 50%, 48%, 0.15), hsla(152, 50%, 38%, 0.05))",
        border: "hsla(152, 50%, 48%, 0.25)",
        text: "hsl(152, 50%, 60%)",
        icon: "✓",
        iconBg: "hsla(152, 50%, 48%, 0.15)",
    },
};

export default function MythCard({ myth, index = 0 }: { myth: Myth; index?: number }) {
    const [expanded, setExpanded] = useState(false);
    const config = verdictConfig[myth.verdict];

    return (
        <div
            className="glass-card overflow-hidden animate-slide-up"
            style={{ animationDelay: `${index * 60}ms` }}
        >
            {/* Verdict header */}
            <div
                className="px-5 py-3.5 flex items-center gap-3"
                style={{
                    background: config.gradient,
                    borderBottom: `1px solid ${config.border}`,
                }}
            >
                <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{
                        background: config.iconBg,
                        color: config.text,
                    }}
                >
                    {config.icon}
                </span>
                <div className="flex-1">
                    <span
                        className="text-xs font-bold uppercase tracking-widest"
                        style={{ color: config.text }}
                    >
                        {config.label}
                    </span>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Verified by {myth.source} · {myth.date}
                    </p>
                </div>
                <div className="flex gap-1.5">
                    {myth.affectedVisas.map((v) => (
                        <span key={v} className="chip">
                            {v}
                        </span>
                    ))}
                </div>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">

                {/* Viral headline */}
                <div
                    className="rounded-xl px-4 py-3"
                    style={{
                        background: "hsla(0, 60%, 50%, 0.06)",
                        border: "1px solid hsla(0, 60%, 50%, 0.12)",
                    }}
                >
                    <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
                        🔥 Viral claim
                    </p>
                    <p className="text-sm italic" style={{ color: "hsl(0, 50%, 70%)" }}>
                        &quot;{myth.viralHeadline}&quot;
                    </p>
                </div>

                {/* Explanation */}
                <div>
                    <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                        ✓ What&apos;s actually true
                    </p>
                    <p
                        className={`text-sm leading-relaxed ${expanded ? "" : "line-clamp-3"}`}
                        style={{ color: "var(--text-secondary)" }}
                    >
                        {myth.explanation}
                    </p>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-xs mt-1.5 font-medium"
                        style={{ color: "var(--accent-calm-light)" }}
                    >
                        {expanded ? "Show less ↑" : "Read full explanation ↓"}
                    </button>
                </div>

                {/* Source */}
                <a
                    href={myth.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
                    style={{ color: "var(--accent-calm-light)" }}
                >
                    📎 View official source: {myth.source} ↗
                </a>
            </div>
        </div>
    );
}