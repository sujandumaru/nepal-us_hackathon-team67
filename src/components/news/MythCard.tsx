"use client";

import { useState } from "react";

type Myth = {
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
        bg: "bg-red-500/20",
        border: "border-red-500/40",
        text: "text-red-400",
        icon: "❌",
        tagBg: "bg-red-500",
    },
    misleading: {
        label: "MISLEADING",
        bg: "bg-yellow-500/20",
        border: "border-yellow-500/40",
        text: "text-yellow-400",
        icon: "⚠️",
        tagBg: "bg-yellow-500",
    },
    true: {
        label: "TRUE",
        bg: "bg-green-500/20",
        border: "border-green-500/40",
        text: "text-green-400",
        icon: "✅",
        tagBg: "bg-green-500",
    },
};

export default function MythCard({ myth }: { myth: Myth }) {
    const [expanded, setExpanded] = useState(false);
    const config = verdictConfig[myth.verdict];

    return (
        <div className={`border rounded-2xl overflow-hidden transition-all ${config.border}`}>

            {/* Verdict Header */}
            <div className={`px-5 py-3 flex items-center gap-3 ${config.bg}`}>
                <span className="text-xl">{config.icon}</span>
                <div className="flex-1">
                    <span className={`text-xs font-bold uppercase tracking-widest ${config.text}`}>
                        {config.label}
                    </span>
                    <p className="text-gray-400 text-xs mt-0.5">
                        Verified by {myth.source} · {myth.date}
                    </p>
                </div>
                <div className="flex gap-1">
                    {myth.affectedVisas.map((v) => (
                        <span
                            key={v}
                            className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full"
                        >
                            {v}
                        </span>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="bg-gray-900 px-5 py-4 space-y-4">

                {/* Viral Headline */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        🔥 Viral claim
                    </p>
                    <p className="text-gray-300 text-sm italic">"{myth.viralHeadline}"</p>
                </div>

                {/* What's Actually True */}
                <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                        ✅ What's actually true
                    </p>
                    <p className={`text-sm leading-relaxed ${expanded ? "" : "line-clamp-3"} text-gray-300`}>
                        {myth.explanation}
                    </p>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-blue-400 text-xs mt-1 hover:text-blue-300"
                    >
                        {expanded ? "Show less ↑" : "Read full explanation ↓"}
                    </button>
                </div>

                {/* Source */}

                href={myth.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300"
                <a>
                    📎 View official source: {myth.source} ↗
                </a>

            </div>
        </div >
    );
}