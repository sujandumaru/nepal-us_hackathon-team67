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

// Suggested questions per visa type — used in GENERAL mode (no news context)
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

// Suggested questions per visa type — used in NEWS-SPECIFIC mode
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

    // Auto-send prefilled question once on mount
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

            const data = await res.json();
            setMessages([...updated, { role: "assistant", content: data.reply }]);
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
            <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-4 py-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        ← Back
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-white font-semibold text-sm">ImmiCalm Assistant 🕊️</h1>
                        <p className="text-gray-500 text-xs truncate">
                            {isGeneralMode
                                ? `General ${profile.visaType ?? "immigration"} questions`
                                : news?.title}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-gray-500">
                            {isGeneralMode ? "General" : "News"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Context banner — only in news-specific mode */}
            {!isGeneralMode && news && (
                <div className="mx-4 mt-4 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Discussing</p>
                    <p className="text-sm text-gray-300 font-medium">{news.title}</p>
                    <p className="text-xs text-blue-400 mt-1">
                        Source: {news.source} · {news.date}
                    </p>
                </div>
            )}

            {/* General mode banner */}
            {isGeneralMode && (
                <div className="mx-4 mt-4 bg-blue-900/30 border border-blue-800/50 rounded-xl px-4 py-3">
                    <p className="text-xs text-blue-400 uppercase tracking-wider mb-1">General mode</p>
                    <p className="text-sm text-gray-300">
                        Answering general {profile.visaType ?? "immigration"} questions.
                        For a specific news update, use <span className="text-blue-400 font-medium">Ask AI</span> on any news card.
                    </p>
                </div>
            )}

            {/* Disclaimer */}
            <div className="mx-4 mt-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2">
                <p className="text-xs text-yellow-400">
                    ⚖️ Not legal advice. For your specific situation, always consult a certified immigration attorney.
                </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
                {messages.map((msg, i) => (
                    <MessageBubble key={i} message={msg} />
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="flex items-end gap-2">
                            <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-sm">
                                🕊️
                            </div>
                            <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm">
                                <div className="flex gap-1 items-center h-4">
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0ms]" />
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:150ms]" />
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:300ms]" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Suggested Questions */}
            {messages.length <= 2 && !loading && (
                <div className="px-4 pb-3">
                    <p className="text-xs text-gray-500 mb-2">Suggested questions</p>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.map((s) => (
                            <button
                                key={s}
                                onClick={() => sendMessage(s)}
                                className="text-xs bg-gray-800 text-gray-300 border border-gray-700 px-3 py-1.5 rounded-full hover:bg-gray-700 transition-all"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="sticky bottom-0 bg-gray-950 border-t border-gray-800 px-4 py-4">
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        placeholder={isGeneralMode ? "Ask a general immigration question..." : "Ask about this update..."}
                        disabled={loading}
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                    <button
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || loading}
                        className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-all"
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
            <div className="min-h-screen flex items-center justify-center text-gray-500">
                Loading...
            </div>
        }>
            <ChatbotContent />
        </Suspense>
    );
}