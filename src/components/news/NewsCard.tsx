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

export default function NewsCard({
    item,
    visaType,
    state,
}: {
    item: NewsItem;
    visaType: string;
    state: string;
}) {
    const router = useRouter();
    const [expanded, setExpanded] = useState(false);

    const isRelevantState =
        item.affectedStates.includes("all") || item.affectedStates.includes(state);

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4 hover:border-gray-600 transition-all">

            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                            {item.source}
                        </span>
                        {item.mythBuster && (
                            <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full">
                                🔍 Myth Buster
                            </span>
                        )}
                        {!isRelevantState && (
                            <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">
                                Other state
                            </span>
                        )}
                    </div>
                    <h3 className="text-white font-semibold leading-snug">{item.title}</h3>
                    <p className="text-xs text-gray-500">{item.date}</p>
                </div>
            </div>

            {/* Affect Badge */}
            <AffectBadge severity={item.severity} message={item.affectMessage} />

            {/* Summary (expandable) */}
            <div>
                <p className={`text-gray-400 text-sm leading-relaxed ${!expanded ? "line-clamp-2" : ""}`}>
                    {item.summary}
                </p>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-blue-400 text-xs mt-1 hover:text-blue-300"
                >
                    {expanded ? "Show less ↑" : "Read more ↓"}
                </button>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                    <span
                        key={tag}
                        className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full"
                    >
                        #{tag}
                    </span>
                ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
                <button
                    onClick={() => router.push(`/chatbot?newsId=${item.id}`)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-all"
                >
                    💬 Ask AI about this
                </button>

                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-800 text-gray-400 hover:bg-gray-700 transition-all"
                <a>
                    Source ↗
                </a>
            </div>

        </div >
    );
}