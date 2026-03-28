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
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 hover:border-gray-300 transition-all">

            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider">
                            {item.source}
                        </span>
                        {item.mythBuster && (
                            <span className="text-xs bg-purple-50 text-purple-600 border border-purple-200 px-2 py-0.5 rounded-full">
                                🔍 Myth Buster
                            </span>
                        )}
                        {!isRelevantState && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                Other state
                            </span>
                        )}
                    </div>
                    <h3 className="text-gray-900 font-semibold leading-snug">{item.title}</h3>
                    <p className="text-xs text-gray-400">{item.date}</p>
                </div>
            </div>

            {/* Affect Badge */}
            <AffectBadge severity={item.severity} message={item.affectMessage} />

            {/* Summary */}
            <div>
                <p className={`text-gray-600 text-sm leading-relaxed ${!expanded ? "line-clamp-2" : ""}`}>
                    {item.summary}
                </p>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-blue-500 text-xs mt-1 hover:text-blue-600"
                >
                    {expanded ? "Show less ↑" : "Read more ↓"}
                </button>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                        #{tag}
                    </span>
                ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
                <button
                    onClick={() => router.push(`/chatbot?newsId=${item.id}`)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-all"
                >
                    💬 Ask AI about this
                </button>
                <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                >
                    Source ↗
                </a>
            </div>

        </div>
    );
}