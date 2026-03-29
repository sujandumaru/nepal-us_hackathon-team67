"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import MessageBubble from "@/components/chatbot/MessageBubble";
import newsData from "@/data/news.json";
import { NewsItem } from "@/components/news/NewsCard";

type Message = {
    role: "user" | "assistant";
    content: string;
};

const GENERAL_SUGGESTIONS = {
    F1: [
        "What should I know about maintaining F1 status?",
        "How does OPT work and when should I apply?",
        "What is STEM OPT and am I eligible?",
        "What happens if I travel outside the US on F1?",
    ],
    H1B: [
        "What are my rights as an H1B holder?",
        "Can I change employers on H1B?",
        "What should I know before traveling internationally?",
        "How does H1B renewal work?",
    ],
};

const NEWS_SUGGESTIONS = {
    F1: [
        "Does this affect my OPT?",
        "Do I need to talk to my DSO?",
        "Is my status at risk?",
        "What should I do next?",
    ],
    H1B: [
        "Does this affect my work authorization?",
        "Should I avoid traveling?",
        "Do I need a lawyer?",
        "What should I do next?",
    ],
};

function ChatbotContent() {
    const { profile } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const newsId = searchParams.get("newsId");
    const prefill = searchParams.get("prefill");

    const news = newsId ? (newsData as NewsItem[]).find((n) => n.id === newsId) : null;
    const isGeneralMode = !news;

    const generalGreeting = `Hi! I'm the ImmiCalm assistant. I can answer general questions about ${profile.visaType ?? "immigration"} visas, status, travel, and work authorization.\n\nWhat would you like to know?`;

    const newsGreeting = news
        ? `Hi! I'm here to help you understand this update:\n\n"${news.title}"\n\nWhat would you like to know? I'll answer based on your ${profile.visaType} visa status${profile.state ? ` in ${profile.state}` : ""}.`
        : generalGreeting;

    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: newsGreeting },
    ]);
    const [input, setInput] = useState(prefill ?? "");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const didAutoSend = useRef(false);

    useEffect(() => {
        if (prefill && !didAutoSend.current) {
            didAutoSend.current = true;
            sendMessage(prefill);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const sendMessage = async (text?: string) => {
        const content = text ?? input.trim();
        if (!content || loading) return;

        const userMessage: Message = { role: "user", content };
        const updated = [...messages, userMessage];

        setMessages(updated);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: updated,
                    newsContext: news ?? null,
                    userProfile: profile,
                    generalMode: isGeneralMode,
                }),
            });

            if (!res.ok) {
                throw new Error("Non-streaming response failed.");
            }

            const data = await res.json();
            const reply = (data?.reply ?? "").trim() || "Sorry, I couldn't generate a response.";
            setMessages([...updated, { role: "assistant", content: reply }]);
        } catch {
            setMessages([
                ...updated,
                { role: "assistant", content: "Something went wrong. Please try again." },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const suggestions = isGeneralMode
        ? (profile.visaType ? GENERAL_SUGGESTIONS[profile.visaType] : GENERAL_SUGGESTIONS.F1)
        : (profile.visaType ? NEWS_SUGGESTIONS[profile.visaType] : NEWS_SUGGESTIONS.F1);

    return (
        <div className="min-h-screen flex flex-col max-w-2xl mx-auto">

            {/* Header */}
            <div
                className="sticky top-0 z-10 glass-nav px-4 py-4"
            >
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="transition-colors font-medium text-sm"
                        style={{ color: "var(--text-muted)" }}
                    >
                        ← Back
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                            ImmiCalm Assistant 🕊️
                        </h1>
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                            {isGeneralMode
                                ? `General ${profile.visaType ?? "immigration"} questions`
                                : news?.title}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div
                            className="w-2 h-2 rounded-full animate-pulse"
                            style={{ background: "var(--accent-safe)" }}
                        />
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {isGeneralMode ? "General" : "News"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Context banner — only in news-specific mode */}
            {!isGeneralMode && news && (
                <div className="mx-4 mt-4">
                    <div className="glass-card-sm px-4 py-3 animate-float-in">
                        <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                            Discussing
                        </p>
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                            {news.title}
                        </p>
                        <p className="text-xs mt-1" style={{ color: "var(--accent-calm-light)" }}>
                            Source: {news.source} · {news.date}
                        </p>
                    </div>
                </div>
            )}

            {/* General mode banner */}
            {isGeneralMode && (
                <div className="mx-4 mt-4">
                    <div
                        className="glass-card-sm px-4 py-3 animate-float-in"
                        style={{
                            background: "var(--accent-calm-glow2)",
                            borderColor: "hsla(168, 55%, 42%, 0.15)",
                        }}
                    >
                        <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--accent-calm-light)" }}>
                            General mode
                        </p>
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                            Answering general {profile.visaType ?? "immigration"} questions.
                            For a specific news update, use{" "}
                            <span className="font-medium" style={{ color: "var(--accent-calm-light)" }}>Ask AI</span> on any news card.
                        </p>
                    </div>
                </div>
            )}

            {/* Disclaimer */}
            <div className="mx-4 mt-3">
                <div
                    className="glass-card-sm px-4 py-2 animate-float-in stagger-1"
                    style={{
                        background: "hsla(38, 80%, 55%, 0.04)",
                        borderColor: "hsla(38, 80%, 55%, 0.12)",
                    }}
                >
                    <p className="text-xs" style={{ color: "hsl(38, 80%, 60%)" }}>
                        ⚖️ Not legal advice. For your specific situation, always consult a certified immigration attorney.
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
                {messages.map((msg, i) => (
                    <MessageBubble key={i} message={msg} />
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="flex items-end gap-2.5">
                            <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
                                style={{
                                    background: "var(--bg-elevated)",
                                    border: "1px solid var(--glass-border)",
                                }}
                            >
                                🕊️
                            </div>
                            <div
                                className="px-4 py-3 rounded-2xl"
                                style={{
                                    background: "var(--glass-bg)",
                                    border: "1px solid var(--glass-border)",
                                    borderBottomLeftRadius: "4px",
                                }}
                            >
                                <div className="flex gap-1.5 items-center h-4">
                                    {[0, 1, 2].map((i) => (
                                        <div
                                            key={i}
                                            className="w-2 h-2 rounded-full"
                                            style={{
                                                background: "var(--accent-calm)",
                                                animation: `wave-dot 1.2s ease-in-out ${i * 0.15}s infinite`,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Suggested Questions */}
            {messages.length <= 2 && !loading && (
                <div className="px-4 pb-3 animate-float-in">
                    <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Suggested questions</p>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.map((s) => (
                            <button
                                key={s}
                                onClick={() => sendMessage(s)}
                                className="glass-btn text-xs px-3.5 py-2 rounded-full"
                                style={{ color: "var(--text-secondary)" }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="sticky bottom-0 glass-nav px-4 py-4">
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        placeholder={isGeneralMode ? "Ask a general immigration question..." : "Ask about this update..."}
                        disabled={loading}
                        className="flex-1 px-4 py-3 text-sm rounded-xl disabled:opacity-50"
                    />
                    <button
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || loading}
                        className="btn-primary px-4 py-3 rounded-xl disabled:opacity-30"
                    >
                        <span className="text-white text-sm">↑</span>
                    </button>
                </div>
            </div>

        </div>
    );
}

export default function ChatbotPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
                Loading...
            </div>
        }>
            <ChatbotContent />
        </Suspense>
    );
}