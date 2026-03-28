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
        headerBg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-600",
        icon: "❌",
    },
    misleading: {
        label: "MISLEADING",
        headerBg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-600",
        icon: "⚠️",
    },
    true: {
        label: "TRUE",
        headerBg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-600",
        icon: "✅",
    },
};

export default function MythCard({ myth }: { myth: Myth }) {
    const [expanded, setExpanded] = useState(false);
    const config = verdictConfig[myth.verdict];

    return (
        <div className={`border rounded-2xl overflow-hidden ${config.border}`}>

            {/* Verdict header */}
            <div className={`px-5 py-3 flex items-center gap-3 ${config.headerBg}`}>
                <span className="text-lg">{config.icon}</span>
                <div className="flex-1">
                    <span className={`text-xs font-bold uppercase tracking-widest ${config.text}`}>
                        {config.label}
                    </span>
                    <p className="text-gray-500 text-xs mt-0.5">
                        Verified by {myth.source} · {myth.date}
                    </p>
                </div>
                <div className="flex gap-1">
                    {myth.affectedVisas.map((v) => (
                        <span key={v} className="text-xs bg-white text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">
                            {v}
                        </span>
                    ))}
                </div>
            </div>

            {/* Body */}
            <div className="bg-white px-5 py-4 space-y-4">

                {/* Viral headline */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">🔥 Viral claim</p>
                    <p className="text-gray-700 text-sm italic">"{myth.viralHeadline}"</p>
                </div>

                {/* Explanation */}
                <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">✅ What's actually true</p>
                    <p className={`text-sm leading-relaxed text-gray-700 ${expanded ? "" : "line-clamp-3"}`}>
                        {myth.explanation}
                    </p>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-blue-500 text-xs mt-1 hover:text-blue-600"
                    >
                        {expanded ? "Show less ↑" : "Read full explanation ↓"}
                    </button>
                </div>

                {/* Source */}
                <a
                    href={myth.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 transition-colors"
                >
                    📎 View official source: {myth.source} ↗
                </a>

            </div>
        </div>
    );
}