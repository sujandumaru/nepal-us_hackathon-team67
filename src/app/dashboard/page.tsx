"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import newsData from "@/data/news.json";
import { NewsItem } from "@/components/news/NewsCard";

// ─── F1 Timeline ──────────────────────────────────────────────────────────────

type TimelineEvent = {
    label: string;
    date: Date;
    note: string;
    type: "milestone" | "deadline" | "expiry" | "suggestion";
    link?: { label: string; url: string };
};

function addDays(base: Date, days: number): Date {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
}
function addMonths(base: Date, months: number): Date {
    const d = new Date(base);
    d.setMonth(d.getMonth() + months);
    return d;
}
function daysUntil(date: Date): number {
    return Math.round((date.getTime() - Date.now()) / 86_400_000);
}
function fmtDate(date: Date): string {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type F1Status = "not_graduated" | "opt" | "stem_opt" | "unknown";

function detectF1Status(gradDateStr: string | null, optStartStr: string | null): F1Status {
    if (!gradDateStr) return "unknown";
    const grad = new Date(gradDateStr);
    const now = new Date();
    if (now < grad) return "not_graduated";
    // graduated — check how long
    const monthsSinceGrad = (now.getTime() - grad.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    if (optStartStr) {
        const optStart = new Date(optStartStr);
        const monthsSinceOpt = (now.getTime() - optStart.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        if (monthsSinceOpt >= 12) return "stem_opt";
        return "opt";
    }
    // no OPT start — infer from grad date
    if (monthsSinceGrad >= 12) return "stem_opt";
    if (monthsSinceGrad >= 0) return "opt";
    return "not_graduated";
}

function buildNotGraduatedTimeline(gradDateStr: string): TimelineEvent[] {
    const grad = new Date(gradDateStr);
    return [
        {
            label: "Earliest OPT application date",
            date: addDays(grad, -90),
            note: "File Form I-765 via your DSO — USCIS recommends applying 90 days before graduation.",
            type: "deadline",
            link: { label: "How to apply for OPT (USCIS)", url: "https://www.uscis.gov/opt" },
        },
        {
            label: "Your graduation date",
            date: grad,
            note: "60-day grace period begins. You can stay in the US while your OPT application is pending.",
            type: "milestone",
        },
        {
            label: "Grace period ends",
            date: addDays(grad, 60),
            note: "OPT must be approved and active by this date, or you need another valid status.",
            type: "deadline",
        },
    ];
}

function buildOPTTimeline(gradDateStr: string, optStartStr: string | null): TimelineEvent[] {
    const grad = new Date(gradDateStr);
    const optStart = optStartStr ? new Date(optStartStr) : addDays(grad, 1);
    const optExpiry = addMonths(optStart, 12);
    const stemDeadline = addDays(optExpiry, -90);

    return [
        {
            label: "OPT started",
            date: optStart,
            note: "Your 12-month work authorization period began.",
            type: "milestone",
        },
        {
            label: "Apply for STEM OPT extension",
            date: stemDeadline,
            note: "File Form I-765 via your DSO at least 90 days before OPT expires. You must work at an E-Verify employer.",
            type: "deadline",
            link: { label: "STEM OPT extension guide (USCIS)", url: "https://www.uscis.gov/working-in-the-united-states/students-and-exchange-visitors/optional-practical-training-extension-for-stem-students-stem-opt" },
        },
        {
            label: "OPT expires",
            date: optExpiry,
            note: "If STEM OPT is pending, you get a 180-day automatic extension.",
            type: "expiry",
        },
        {
            label: "Prepare: H1B lottery (April)",
            date: new Date(optExpiry.getFullYear(), 2, 1), // March 1 of expiry year
            note: "If your employer plans to sponsor H1B, registration opens in early March. Work with your employer's attorney.",
            type: "suggestion",
        },
    ];
}

function buildSTEMOptTimeline(gradDateStr: string, optStartStr: string | null): TimelineEvent[] {
    const grad = new Date(gradDateStr);
    const optStart = optStartStr ? new Date(optStartStr) : addDays(grad, 1);
    const stemExpiry = addMonths(optStart, 36);
    const h1bDeadline = addDays(stemExpiry, -180);

    return [
        {
            label: "STEM OPT active",
            date: addMonths(optStart, 12),
            note: "Your 24-month STEM extension is in effect. Maintain E-Verify employer and file I-983 reports.",
            type: "milestone",
            link: { label: "STEM OPT reporting requirements", url: "https://www.uscis.gov/working-in-the-united-states/students-and-exchange-visitors/optional-practical-training-extension-for-stem-students-stem-opt" },
        },
        {
            label: "Start H1B planning",
            date: h1bDeadline,
            note: "Talk to your employer about H1B sponsorship. H1B lottery registration opens in March each year.",
            type: "suggestion",
        },
        {
            label: "STEM OPT expires",
            date: stemExpiry,
            note: "Total 36 months of work auth ends. You need an approved H1B, a new degree program, or another status.",
            type: "expiry",
        },
    ];
}

// ─── Mood config ──────────────────────────────────────────────────────────────

const MOODS = [
    { score: 1, emoji: "😰", label: "Anxious" },
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

// ─── Orb/status state ─────────────────────────────────────────────────────────

type OrbState = "calm" | "watch" | "alert";

function getOrbState(redCount: number, mood: number | null): OrbState {
    if (redCount > 0 && (mood ?? 5) <= 2) return "alert";
    if (redCount > 0 || (mood ?? 5) <= 2) return "watch";
    if ((mood ?? 5) === 3) return "watch";
    return "calm";
}

type OrbConfig = {
    emoji: string;
    status: string;
    label: string;
    subLabel: (visa: string | null, red: number) => string;
    clickable: boolean;
};

const ORB_CONFIG: Record<OrbState, OrbConfig> = {
    calm: {
        emoji: "🕊️",
        status: "All clear",
        label: "You're okay right now",
        subLabel: (visa) => `No critical updates affecting your ${visa ?? ""} visa`,
        clickable: false,
    },
    watch: {
        emoji: "⚠️",
        status: "Worth checking",
        label: "One item to review",
        subLabel: (_, red) => red > 0
            ? "Tap to see the update that may need attention →"
            : "Based on your mood — we're here if you have questions",
        clickable: true,
    },
    alert: {
        emoji: "🚨",
        status: "Action needed",
        label: "Review your feed",
        subLabel: (_, red) => `${red} update${red > 1 ? "s" : ""} may require action — tap to review →`,
        clickable: true,
    },
};

const ORB_COLORS: Record<OrbState, { bg: string; border: string; statusColor: string; hoverBg: string }> = {
    calm: { bg: "bg-green-50", border: "border-green-200", statusColor: "text-green-700", hoverBg: "" },
    watch: { bg: "bg-amber-50", border: "border-amber-200", statusColor: "text-amber-700", hoverBg: "hover:bg-amber-100 cursor-pointer" },
    alert: { bg: "bg-red-50", border: "border-red-200", statusColor: "text-red-700", hoverBg: "hover:bg-red-100 cursor-pointer" },
};

// ─── Countdown badge ──────────────────────────────────────────────────────────

function CountdownBadge({ days }: { days: number }) {
    if (days < 0) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{Math.abs(days)}d ago</span>;
    if (days < 30) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">⚡ {days}d left</span>;
    if (days < 90) return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{days}d away</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">{days}d away</span>;
}

function dotColor(days: number): string {
    if (days < 0) return "bg-gray-300";
    if (days < 30) return "bg-red-500";
    if (days < 90) return "bg-amber-400";
    return "bg-green-500";
}

function typeIcon(type: TimelineEvent["type"]): string {
    if (type === "deadline") return "⏰";
    if (type === "expiry") return "🔚";
    if (type === "suggestion") return "💡";
    return "📍";
}

const SEV_DOT: Record<string, string> = {
    red: "bg-red-500",
    yellow: "bg-amber-400",
    green: "bg-green-500",
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const router = useRouter();
    const { profile, setProfile } = useUser();

    useEffect(() => {
        if (!profile.visaType) router.push("/onboarding");
    }, [profile, router]);

    const [moodSelected, setMoodSelected] = useState<number | null>(profile.mood);
    const [moodSubmitted, setMoodSubmitted] = useState(!!profile.mood);
    // Derived from persisted profile.mood — survives page navigation
    const showMentorCard = (profile.mood ?? 5) <= 2;

    // F1 timeline inputs
    const [f1GradStatus, setF1GradStatus] = useState<"graduated" | "not_graduated" | null>(
        profile.gradDate ? (new Date(profile.gradDate) <= new Date() ? "graduated" : "not_graduated") : null
    );
    const [gradInput, setGradInput] = useState(profile.gradDate ?? "");
    const [optStartInput, setOptStartInput] = useState(profile.optEndDate ?? ""); // reusing optEndDate field for OPT start

    if (!profile.visaType) return null;

    // ── Data ────────────────────────────────────────────────────────────────────
    const allNews = newsData as NewsItem[];
    const relevantNews = allNews.filter((n) => n.affectedVisas.includes(profile.visaType!));
    const redCount = relevantNews.filter((n) => n.severity === "red").length;
    const recentNews = relevantNews.slice(0, 3);

    const orbState = getOrbState(redCount, moodSelected);
    const orb = ORB_CONFIG[orbState];
    const orbColors = ORB_COLORS[orbState];

    // F1 timeline
    const f1Status = detectF1Status(gradInput || null, optStartInput || null);
    let timeline: TimelineEvent[] = [];
    if (profile.visaType === "F1" && gradInput) {
        if (f1Status === "not_graduated") timeline = buildNotGraduatedTimeline(gradInput);
        else if (f1Status === "opt") timeline = buildOPTTimeline(gradInput, optStartInput || null);
        else if (f1Status === "stem_opt") timeline = buildSTEMOptTimeline(gradInput, optStartInput || null);
    }

    const nextUpcoming = timeline.find((e) => daysUntil(e.date) >= 0);

    // State-specific note
    const stateNote = profile.state === "CA"
        ? "California has enacted additional state-level protections for immigrant workers — your rights are extra-protected here."
        : null;

    // ── Handlers ────────────────────────────────────────────────────────────────
    function handleMood(score: number) {
        setMoodSelected(score);
        setMoodSubmitted(true);
        setProfile({ ...profile, mood: score });
    }

    function handleGradInput(val: string) {
        setGradInput(val);
        setProfile({ ...profile, gradDate: val || null });
    }

    function handleOptStartInput(val: string) {
        setOptStartInput(val);
        // Store in optEndDate field as OPT start (the field name is a bit overloaded here)
        setProfile({ ...profile, optEndDate: val || null });
    }

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-24">

            {/* Profile strip */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Your profile</p>
                    <p className="font-semibold text-gray-900">
                        {profile.visaType} · {profile.state}
                        {stateNote && <span className="ml-2 text-xs font-normal text-green-600">✓ Extra protections</span>}
                    </p>
                </div>
                <button
                    onClick={() => router.push("/onboarding")}
                    className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                    Change profile
                </button>
            </div>

            {/* State-specific note */}
            {stateNote && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                    <p className="text-xs text-green-700">🏛️ {stateNote}</p>
                </div>
            )}

            {/* ── Status banner (clickable when watch/alert) ─────────────────── */}
            {orb.clickable ? (
                <button
                    onClick={() => router.push("/news")}
                    className={`w-full text-left rounded-xl border ${orbColors.bg} ${orbColors.border} px-4 py-3 flex items-center gap-3 transition-all ${orbColors.hoverBg}`}
                >
                    <span className="text-2xl flex-shrink-0">{orb.emoji}</span>
                    <div className="flex-1 min-w-0">
                        <span className={`text-xs font-semibold uppercase tracking-wider ${orbColors.statusColor}`}>
                            {orb.status}
                        </span>
                        <h2 className="text-base font-semibold text-gray-900 mt-0.5">{orb.label}</h2>
                        <p className="text-xs text-gray-600 mt-0.5">{orb.subLabel(profile.visaType, redCount)}</p>
                    </div>
                    <span className="text-gray-400 flex-shrink-0">→</span>
                </button>
            ) : (
                <div className={`rounded-xl border ${orbColors.bg} ${orbColors.border} px-4 py-3 flex items-center gap-3`}>
                    <span className="text-2xl flex-shrink-0">{orb.emoji}</span>
                    <div className="flex-1 min-w-0">
                        <span className={`text-xs font-semibold uppercase tracking-wider ${orbColors.statusColor}`}>
                            {orb.status}
                        </span>
                        <h2 className="text-base font-semibold text-gray-900 mt-0.5">{orb.label}</h2>
                        <p className="text-xs text-gray-600 mt-0.5">{orb.subLabel(profile.visaType, redCount)}</p>
                    </div>
                </div>
            )}

            {/* ── Stats row (metric card style) ─────────────────────────────── */}
            <div className={`grid gap-3 ${profile.visaType === "F1" ? "grid-cols-3" : "grid-cols-2"}`}>
                <div className="bg-gray-100 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-500 mb-1">Active alerts</p>
                    <p className={`text-xl font-semibold ${redCount > 0 ? "text-red-600" : "text-green-700"}`}>
                        {redCount === 0 ? "None" : String(redCount)}
                    </p>
                </div>
                {profile.visaType === "F1" && (
                    <div className="bg-gray-100 rounded-xl px-4 py-3">
                        <p className="text-xs text-gray-500 mb-1">Next deadline</p>
                        <p className={`text-xl font-semibold ${nextUpcoming && daysUntil(nextUpcoming.date) < 30 ? "text-red-600" : "text-gray-900"}`}>
                            {nextUpcoming ? `${daysUntil(nextUpcoming.date)}d` : "—"}
                        </p>
                    </div>
                )}
                <div className="bg-gray-100 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-500 mb-1">Visa status</p>
                    <p className="text-xl font-semibold text-green-700">Active</p>
                </div>
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
                            <span className="text-xl">{m.emoji}</span>
                            {/* Always visible — shortened to fit on mobile */}
                            <span className="text-xs text-gray-500 mt-1">{m.label}</span>
                        </button>
                    ))}
                </div>

                {moodSubmitted && moodSelected && (
                    <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                        <p className="text-sm text-blue-700">{moodMessage(moodSelected)}</p>
                    </div>
                )}

                {/* Peer/mentor CTA — shown when mood is anxious or worried, persists across navigation */}
                {showMentorCard && (
                    <div className="mt-3 bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <p className="text-sm font-medium text-purple-800 mb-1">
                            Would you like to talk with someone?
                        </p>
                        <p className="text-xs text-purple-600 mb-3">
                            Connecting with a peer who's navigated the same visa journey can really help. These communities are active and welcoming.
                        </p>
                        <div className="flex gap-2">
                            <a
                                href={profile.visaType === "H1B"
                                    ? "https://www.reddit.com/r/h1b"
                                    : "https://www.reddit.com/r/f1visa"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 text-center text-xs py-2 px-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
                            >
                                {profile.visaType === "H1B" ? "r/H1B community →" : "r/F1visa community →"}
                            </a>
                            <a
                                href="https://www.reddit.com/r/immigration"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 text-center text-xs py-2 px-3 bg-white text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors"
                            >
                                r/Immigration →
                            </a>
                            <a
                                href="https://www.mentorcruise.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 text-center text-xs py-2 px-3 bg-white text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors"
                            >
                                Find a mentor →
                            </a>
                        </div>
                        <p className="text-xs text-purple-400 mt-2 text-center">
                            Select a calmer mood above to dismiss
                        </p>
                    </div>
                )}
            </div>

            {/* ── F1 Timeline ───────────────────────────────────────────────── */}
            {profile.visaType === "F1" && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <p className="text-sm font-medium text-gray-700 mb-1">F-1 key dates</p>
                    <p className="text-xs text-gray-400 mb-4">Track your OPT and STEM OPT deadlines</p>

                    {/* Graduated toggle */}
                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => setF1GradStatus("not_graduated")}
                            className={`flex-1 py-2.5 text-sm rounded-xl border-2 transition-all font-medium ${f1GradStatus === "not_graduated"
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-gray-200 text-gray-500 hover:border-gray-300"
                                }`}
                        >
                            🎓 Not yet graduated
                        </button>
                        <button
                            onClick={() => setF1GradStatus("graduated")}
                            className={`flex-1 py-2.5 text-sm rounded-xl border-2 transition-all font-medium ${f1GradStatus === "graduated"
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-gray-200 text-gray-500 hover:border-gray-300"
                                }`}
                        >
                            ✅ Graduated
                        </button>
                    </div>

                    {/* Inputs based on status */}
                    {f1GradStatus === "not_graduated" && (
                        <div className="flex items-center gap-3 mb-5">
                            <label className="text-sm text-gray-600 min-w-max">Expected graduation</label>
                            <input
                                type="date"
                                value={gradInput}
                                onChange={(e) => handleGradInput(e.target.value)}
                                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-400 bg-gray-50"
                            />
                        </div>
                    )}

                    {f1GradStatus === "graduated" && (
                        <div className="space-y-3 mb-5">
                            <div className="flex items-center gap-3">
                                <label className="text-sm text-gray-600 min-w-max">Graduation date</label>
                                <input
                                    type="date"
                                    value={gradInput}
                                    onChange={(e) => handleGradInput(e.target.value)}
                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-400 bg-gray-50"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-sm text-gray-600 min-w-max">OPT start date</label>
                                <input
                                    type="date"
                                    value={optStartInput}
                                    onChange={(e) => handleOptStartInput(e.target.value)}
                                    placeholder="If OPT has started"
                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-400 bg-gray-50"
                                />
                            </div>
                            {gradInput && !optStartInput && (
                                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                    💡 If OPT hasn't started yet, you can leave OPT start date blank — we'll estimate from your graduation date.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Status badge */}
                    {f1GradStatus && gradInput && (
                        <div className="mb-4 flex items-center gap-2">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${f1Status === "not_graduated" ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : f1Status === "opt" ? "bg-green-50 text-green-700 border border-green-200"
                                    : f1Status === "stem_opt" ? "bg-purple-50 text-purple-700 border border-purple-200"
                                        : "bg-gray-100 text-gray-500"
                                }`}>
                                {f1Status === "not_graduated" ? "📚 Pre-graduation"
                                    : f1Status === "opt" ? "💼 On OPT"
                                        : f1Status === "stem_opt" ? "🔬 On STEM OPT"
                                            : "—"}
                            </span>
                        </div>
                    )}

                    {/* Timeline */}
                    {timeline.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">
                            {f1GradStatus
                                ? "Enter your dates above to see your immigration timeline."
                                : "Select your graduation status above to get started."}
                        </p>
                    ) : (
                        <div className="space-y-0">
                            {timeline.map((event, i) => {
                                const days = daysUntil(event.date);
                                const isPast = days < 0;
                                return (
                                    <div key={event.label} className="flex gap-3">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${dotColor(days)}`} />
                                            {i < timeline.length - 1 && (
                                                <div className="w-px flex-1 bg-gray-200 my-1" />
                                            )}
                                        </div>
                                        <div className={`pb-4 flex-1 min-w-0 ${isPast ? "opacity-50" : ""}`}>
                                            <div className="flex items-center flex-wrap gap-2">
                                                <span className={`text-sm font-medium ${isPast ? "text-gray-400" : "text-gray-800"}`}>
                                                    {typeIcon(event.type)} {event.label}
                                                </span>
                                                <CountdownBadge days={days} />
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5">{fmtDate(event.date)}</p>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{event.note}</p>
                                            {event.link && (
                                                <a
                                                    href={event.link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-blue-500 hover:text-blue-600 mt-1 inline-block"
                                                >
                                                    📎 {event.link.label} ↗
                                                </a>
                                            )}
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