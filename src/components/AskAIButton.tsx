"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";

export default function AskAIButton() {
    const router = useRouter();
    const { profile } = useUser();
    const [open, setOpen] = useState(false);

    // General questions — NOT tied to any specific news item
    const suggestions = profile.visaType === "F1"
        ? [
            "What should I know about maintaining F1 status?",
            "How does OPT work and when should I apply?",
            "What happens if I travel outside the US?",
            "What is STEM OPT and am I eligible?",
        ]
        : [
            "What are my rights as an H1B holder?",
            "Can I change employers on H1B?",
            "What should I know before traveling internationally?",
            "How does H1B renewal work?",
        ];

    function handleSuggestion(q: string) {
        // No newsId — opens general chatbot with prefilled question
        router.push(`/chatbot?prefill=${encodeURIComponent(q)}`);
        setOpen(false);
    }

    function handleOpenChat() {
        // General chatbot — no newsId passed
        router.push("/chatbot");
        setOpen(false);
    }

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Panel */}
            {open && (
                <div className="fixed bottom-20 right-4 z-50 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-blue-600 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🕊️</span>
                            <div>
                                <p className="text-white text-sm font-semibold">ImmiCalm Assistant</p>
                                <p className="text-blue-200 text-xs">
                                    {profile.visaType ? `General ${profile.visaType} questions` : "Ask anything about immigration"}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="text-blue-200 hover:text-white text-xl leading-none"
                        >
                            ×
                        </button>
                    </div>

                    {/* Info note */}
                    <div className="px-4 pt-3 pb-0">
                        <p className="text-xs text-gray-400 leading-relaxed">
                            General immigration questions. For news-specific answers, use <strong className="text-gray-600">Ask AI</strong> on each news card.
                        </p>
                    </div>

                    {/* Quick questions */}
                    <div className="px-4 py-3 space-y-2">
                        <p className="text-xs text-gray-400 uppercase tracking-wider">Quick questions</p>
                        {suggestions.map((s) => (
                            <button
                                key={s}
                                onClick={() => handleSuggestion(s)}
                                className="w-full text-left text-sm text-gray-700 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-200 px-3 py-2 rounded-xl transition-all"
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {/* Open full chat */}
                    <div className="px-4 pb-4">
                        <button
                            onClick={handleOpenChat}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all"
                        >
                            Open full chat →
                        </button>
                    </div>
                </div>
            )}

            {/* FAB */}
            <button
                onClick={() => setOpen((v) => !v)}
                className={`fixed bottom-5 right-4 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 ${open ? "bg-gray-700 rotate-90" : "bg-blue-600 hover:bg-blue-500"
                    }`}
                aria-label="Ask AI"
            >
                {open
                    ? <span className="text-white text-xl">×</span>
                    : <span className="text-2xl">🕊️</span>
                }
            </button>
        </>
    );
}