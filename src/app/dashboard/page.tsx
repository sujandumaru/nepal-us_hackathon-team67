"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import newsData from "@/data/news.json";
import { NewsItem } from "@/components/news/NewsCard";

// ─── Timeline calculation ─────────────────────────────────────────────────────

type TimelineEvent = {
    label: string;
    date: Date;
    note: string;
    type: "milestone" | "deadline" | "expiry";
};

function buildF1Timeline(gradDateStr: string): TimelineEvent[] {
    const grad = new Date(gradDateStr);

    const add = (base: Date, days: number) => {
        const d = new Date(base);
        d.setDate(d.getDate() + days);
        return d;
    };
    const addMonths = (base: Date, months: number) => {
        const d = new Date(base);
        d.setMonth(d.getMonth() + months);
        return d;
    };

    return [
        {
            label: "Earliest OPT application",
            date: add(grad, -90),
            note: "Apply to USCIS via your DSO — 90 days before graduation",
            type: "deadline",
        },
        {
            label: "Graduation day",
            date: grad,
            note: "Your F-1 status grace period begins",
            type: "milestone",
        },
        {
            label: "OPT period begins",
            date: add(grad, 1),
            note: "60-day grace period after graduation ends here",
            type: "milestone",
        },
        {
            label: "Apply for STEM OPT extension",
            date: add(addMonths(grad, 12), -90),
            note: "File Form I-765 with your DSO at least 90 days before OPT expires",
            type: "deadline",
        },
        {
            label: "OPT expires",
            date: addMonths(grad, 12),
            note: "12 months of work authorization end",
            type: "expiry",
        },
        {
            label: "STEM OPT expires",
            date: addMonths(grad, 36),
            note: "24-month STEM extension ends — total 36 months from graduation",
            type: "expiry",
        },
    ];
}

function daysUntil(date: Date): number {
    return Math.round((date.getTime() - Date.now()) / 86_400_000);
}

function fmtDate(date: Date): string {
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

// ─── Mood config ──────────────────────────────────────────────────────────────

const MOODS = [
    { score: 1, emoji: "😰", label: "Very anxious" },
    { score: 2, emoji: "😟", label: "Worried" },
    { score: 3, emoji: "😐", label: "Neutral" },
    { score: 4, emoji: "🙂", label: "Okay" },
    { score: 5, emoji: "😌", label: "Calm" },
];

function moodMessage(score: number): string {
    if (score <= 2) return "We've got you. Most headlines won't affect you — check your feed for what actually matters.";
    if (score === 3) return "Stay informed, stay grounded. Here's a summary of what matters to you.";
    return "Great headspace! Here's your daily immigration summary.";
}

// ─── Orb state ────────────────────────────────────────────────────────────────

type OrbState = "calm" | "watch" | "alert";

function getOrbState(redCount: number, mood: number | null): OrbState {
    if (redCount > 0 && (mood ?? 5) <= 2) return "alert";
    if (redCount > 0 || (mood ?? 5) <= 2) return "watch";
    if ((mood ?? 5) === 3) return "watch";
    return "calm";
}

const ORB_CONFIG: Record<OrbState, { emoji: string; status: string; label: string; subLabel: (visa: string | null, red: number) => string }> = {
    calm: {
        emoji: "🕊️",
        status: "All clear",
        label: "You're okay right now",
        subLabel: (visa) => `No critical updates affecting your ${visa ?? ""} visa`,
    },
    watch: {
        emoji: "⚠️",
        status: "Worth checking",
        label: "One item to review",
        subLabel: (_, red) => red > 0 ? "An update in your news feed may need attention" : "Based on your mood — here to help if you have questions",
    },
    alert: {
        emoji: "🚨",
        status: "Action needed",
        label: "Review your feed",
        subLabel: (_, red) => `${red} update${red > 1 ? "s" : ""} in your feed may require action`,
    },
};

const ORB_COLORS: Record<OrbState, { bg: string; border: string; statusColor: string }> = {
    calm: { bg: "bg-green-50", border: "border-green-300", statusColor: "text-green-700" },
    watch: { bg: "bg-amber-50", border: "border-amber-300", statusColor: "text-amber-700" },
    alert: { bg: "bg-red-50", border: "border-red-300", statusColor: "text-red-700" },
};

// ─── Countdown badge ──────────────────────────────────────────────────────────

function CountdownBadge({ days }: { days: number }) {
    if (days < 0) {
        return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{Math.abs(days)}d ago</span>;
    }
    if (days < 30) {
        return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">⚡ {days}d left</span>;
    }
    if (days < 90) {
        return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{days}d away</span>;
    }
    return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">{days}d away</span>;
}

function dotColor(days: number): string {
    if (days < 0) return "bg-gray-300";
    if (days < 30) return "bg-red-500";
    if (days < 90) return "bg-amber-400";
    return "bg-green-500";
}

// ─── News severity badge color ────────────────────────────────────────────────

const SEV_DOT: Record<string, string> = {
    red: "bg-red-500",
    yellow: "bg-amber-400",
    green: "bg-green-500",
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const router = useRouter();
    const { profile, setProfile } = useUser();

    // Redirect to onboarding if no profile
    useEffect(() => {
        if (!profile.visaType) router.push("/onboarding");
    }, [profile, router]);

    const [gradInput, setGradInput] = useState(profile.gradDate ?? "");
    const [moodSelected, setMoodSelected] = useState<number | null>(profile.mood);
    const [moodSubmitted, setMoodSubmitted] = useState(!!profile.mood);

    if (!profile.visaType) return null;

    // ── Data ────────────────────────────────────────────────────────────────────
    const relevantNews = (newsData as NewsItem[]).filter((n) =>
        n.affectedVisas.includes(profile.visaType!)
    );
    const redCount = relevantNews.filter((n) => n.severity === "red").length;
    const recentNews = relevantNews.slice(0, 3);

    const orbState = getOrbState(redCount, moodSelected);
    const orb = ORB_CONFIG[orbState];
    const orbColors = ORB_COLORS[orbState];

    // Timeline
    const timeline = gradInput ? buildF1Timeline(gradInput) : [];
    const nextDeadline = timeline.find((e) => daysUntil(e.date) >= 0);
    const nextDeadlineDays = nextDeadline ? daysUntil(nextDeadline.date) : null;

    // ── Handlers ────────────────────────────────────────────────────────────────
    function handleMood(score: number) {
        setMoodSelected(score);
        setMoodSubmitted(true);
        setProfile({ ...profile, mood: score });
    }

    function handleGradChange(val: string) {
        setGradInput(val);
        setProfile({ ...profile, gradDate: val || null });
    }

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

            {/* Profile strip */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Your profile</p>
                    <p className="font-semibold text-gray-900">
                        {profile.visaType} · {profile.state}
                    </p>
                </div>
                <button
                    onClick={() => router.push("/onboarding")}
                    className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                    Change profile
                </button>
            </div>

            {/* ── Peace of Mind Orb ─────────────────────────────────────────── */}
            <div className={`rounded-2xl border-2 ${orbColors.bg} ${orbColors.border} px-6 py-6 flex items-center gap-5`}>
                <div className={`w-20 h-20 rounded-full border-2 ${orbColors.border} flex items-center justify-center flex-shrink-0 bg-white`}>
                    <span className="text-4xl leading-none">{orb.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <span className={`text-xs font-semibold uppercase tracking-wider ${orbColors.statusColor}`}>
                        {orb.status}
                    </span>
                    <h2 className="text-xl font-semibold text-gray-900 mt-0.5">{orb.label}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {orb.subLabel(profile.visaType, redCount)}
                    </p>
                </div>
            </div>

            {/* ── Stats row ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    {
                        label: "Active alerts",
                        value: redCount === 0 ? "None" : String(redCount),
                        valueClass: redCount > 0 ? "text-red-600" : "text-green-700",
                    },
                    {
                        label: "Next deadline",
                        value: nextDeadlineDays !== null ? `${nextDeadlineDays}d` : "—",
                        valueClass: nextDeadlineDays !== null && nextDeadlineDays < 30 ? "text-red-600" : "text-gray-900",
                    },
                    {
                        label: "Visa status",
                        value: "Active",
                        valueClass: "text-green-700",
                    },
                ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                        <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                        <p className={`text-2xl font-semibold ${s.valueClass}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* ── Mood check-in ─────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-sm font-medium text-gray-700 mb-1">How are you feeling today?</p>
                <p className="text-xs text-gray-400 mb-4">About your immigration situation</p>

                <div className="flex gap-2 justify-between">
                    {MOODS.map((m) => (
                        <button
                            key={m.score}
                            onClick={() => handleMood(m.score)}
                            className={`flex-1 flex flex-col items-center py-3 rounded-xl border-2 transition-all ${moodSelected === m.score
                                    ? "border-blue-400 bg-blue-50"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                        >
                            <span className="text-2xl">{m.emoji}</span>
                            <span className="text-xs text-gray-500 mt-1 hidden sm:block">{m.label}</span>
                        </button>
                    ))}
                </div>

                {moodSubmitted && moodSelected && (
                    <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                        <p className="text-sm text-blue-700">{moodMessage(moodSelected)}</p>
                    </div>
                )}
            </div>

            {/* ── F1 Timeline ───────────────────────────────────────────────── */}
            {(profile.visaType === "F1") && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <p className="text-sm font-medium text-gray-700 mb-1">F-1 key dates</p>
                    <p className="text-xs text-gray-400 mb-4">Enter your graduation date to track OPT & STEM OPT deadlines</p>

                    <div className="flex items-center gap-3 mb-5">
                        <label className="text-sm text-gray-600 min-w-max">Graduation date</label>
                        <input
                            type="date"
                            value={gradInput}
                            onChange={(e) => handleGradChange(e.target.value)}
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-400 bg-gray-50"
                        />
                    </div>

                    {timeline.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">
                            Enter your graduation date above to see your full immigration timeline.
                        </p>
                    ) : (
                        <div className="space-y-0">
                            {timeline.map((event, i) => {
                                const days = daysUntil(event.date);
                                const isPast = days < 0;
                                return (
                                    <div key={event.label} className="flex gap-3">
                                        {/* Timeline spine */}
                                        <div className="flex flex-col items-center">
                                            <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${dotColor(days)}`} />
                                            {i < timeline.length - 1 && (
                                                <div className="w-px flex-1 bg-gray-200 my-1" />
                                            )}
                                        </div>
                                        {/* Content */}
                                        <div className={`pb-4 flex-1 min-w-0 ${isPast ? "opacity-50" : ""}`}>
                                            <div className="flex items-center flex-wrap gap-2">
                                                <span className={`text-sm font-medium ${isPast ? "text-gray-400" : "text-gray-800"}`}>
                                                    {event.label}
                                                </span>
                                                <CountdownBadge days={days} />
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5">{fmtDate(event.date)}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{event.note}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── News summary ──────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-gray-700">Recent updates for you</p>
                    <button
                        onClick={() => router.push("/news")}
                        className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
                    >
                        View all →
                    </button>
                </div>

                {recentNews.length === 0 ? (
                    <div className="text-center py-6">
                        <span className="text-3xl">✅</span>
                        <p className="text-sm text-gray-500 mt-2">No updates affecting you right now</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recentNews.map((item) => (
                            <div key={item.id} className="flex gap-3 items-start">
                                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${SEV_DOT[item.severity] ?? "bg-gray-400"}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-800 leading-snug">{item.title}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{item.affectMessage} · {item.date}</p>
                                </div>
                                <button
                                    onClick={() => router.push(`/chatbot?newsId=${item.id}`)}
                                    className="text-xs text-blue-400 hover:text-blue-600 flex-shrink-0 transition-colors"
                                >
                                    Ask AI
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-gray-400 pb-2">
                All updates sourced from official government sources only.
                Not legal advice — consult an attorney for your specific situation.
            </p>

        </div>
    );
}