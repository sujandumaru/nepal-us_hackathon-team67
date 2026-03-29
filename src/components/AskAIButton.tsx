"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useUser } from "@/lib/userContext";

export default function AskAIButton() {
    const router = useRouter();
    const { profile } = useUser();
    const [open, setOpen] = useState(false);

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
        router.push(`/chatbot?prefill=${encodeURIComponent(q)}`);
        setOpen(false);
    }

    function handleOpenChat() {
        router.push("/chatbot");
        setOpen(false);
    }

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 z-40 animate-fade-in"
                    style={{ background: "hsla(222, 28%, 5%, 0.5)", backdropFilter: "blur(4px)" }}
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Panel */}
            {open && (
                <div
                    className="fixed bottom-20 right-4 z-50 w-80 glass-card overflow-hidden animate-scale-in"
                    style={{ transformOrigin: "bottom right" }}
                >
                    {/* Header */}
                    <div
                        className="px-4 py-3.5 flex items-center justify-between"
                        style={{
                            background: "linear-gradient(135deg, var(--accent-calm), hsl(168, 60%, 34%))",
                        }}
                    >
                        <div className="flex items-center gap-2.5">
                            <Image src="/logo.png" alt="ImmiCalm" width={24} height={24} className="rounded" />
                            <div>
                                <p className="text-white text-sm font-semibold">ImmiCalm Assistant</p>
                                <p className="text-white/60 text-xs">
                                    {profile.visaType ? `General ${profile.visaType} questions` : "Ask anything about immigration"}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="text-white/60 hover:text-white text-xl leading-none transition-colors"
                        >
                            ×
                        </button>
                    </div>

                    {/* Info note */}
                    <div className="px-4 pt-3 pb-0">
                        <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                            General immigration questions. For news-specific answers, use{" "}
                            <strong style={{ color: "var(--accent-calm-light)" }}>Ask AI</strong> on each news card.
                        </p>
                    </div>

                    {/* Quick questions */}
                    <div className="px-4 py-3 space-y-2">
                        <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                            Quick questions
                        </p>
                        {suggestions.map((s) => (
                            <button
                                key={s}
                                onClick={() => handleSuggestion(s)}
                                className="glass-btn w-full text-left text-sm px-3 py-2.5"
                                style={{ color: "var(--text-secondary)" }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {/* Open full chat */}
                    <div className="px-4 pb-4">
                        <button
                            onClick={handleOpenChat}
                            className="btn-primary w-full py-2.5 text-sm"
                        >
                            Open full chat →
                        </button>
                    </div>
                </div>
            )}

            {/* FAB */}
            <button
                onClick={() => setOpen((v) => !v)}
                className={`fixed bottom-5 right-4 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${open ? "" : "animate-breathe"}`}
                style={{
                    background: open
                        ? "var(--bg-elevated)"
                        : "linear-gradient(135deg, var(--accent-calm), hsl(168, 60%, 34%))",
                    boxShadow: open
                        ? "none"
                        : "0 0 24px -4px var(--accent-calm-glow), 0 4px 12px -2px hsla(0,0%,0%,0.3)",
                    border: `1px solid ${open ? "var(--glass-border)" : "hsla(168, 55%, 42%, 0.3)"}`,
                }}
                aria-label="Ask AI"
            >
                {open
                    ? <span className="text-xl" style={{ color: "var(--text-secondary)" }}>×</span>
                    : <Image src="/logo.png" alt="Ask AI" width={28} height={28} className="rounded-lg" />
                }
            </button>
        </>
    );
}