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
    const monthsSinceGrad = (now.getTime() - grad.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    if (optStartStr) {
        const optStart = new Date(optStartStr);
        const monthsSinceOpt = (now.getTime() - optStart.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        if (monthsSinceOpt >= 12) return "stem_opt";
        return "opt";
    }
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
            date: new Date(optExpiry.getFullYear(), 2, 1),
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
    if (score === 3) return "Stay informed, stay grounded. Keep checking news for what matters to you.";
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

const ORB_STYLES: Record<OrbState, { orbGradient: string; glowColor: string; statusColor: string; ringColor: string }> = {
    calm: {
        orbGradient: "linear-gradient(135deg, hsl(152, 50%, 48%), hsl(168, 55%, 42%))",
        glowColor: "hsla(152, 50%, 48%, 0.2)",
        statusColor: "hsl(152, 50%, 60%)",
        ringColor: "hsla(152, 50%, 48%, 0.25)",
    },
    watch: {
        orbGradient: "linear-gradient(135deg, hsl(38, 80%, 55%), hsl(28, 80%, 50%))",
        glowColor: "hsla(38, 80%, 55%, 0.2)",
        statusColor: "hsl(38, 80%, 65%)",
        ringColor: "hsla(38, 80%, 55%, 0.25)",
    },
    alert: {
        orbGradient: "linear-gradient(135deg, hsl(0, 60%, 55%), hsl(350, 60%, 48%))",
        glowColor: "hsla(0, 60%, 55%, 0.2)",
        statusColor: "hsl(0, 60%, 65%)",
        ringColor: "hsla(0, 60%, 55%, 0.25)",
    },
};

function typeIcon(type: TimelineEvent["type"]): string {
    if (type === "deadline") return "⏰";
    if (type === "expiry") return "🔚";
    if (type === "suggestion") return "💡";
    return "📍";
}

const SEV_COLORS: Record<string, { dot: string; glow: string }> = {
    red: { dot: "hsl(0, 60%, 55%)", glow: "hsla(0, 60%, 55%, 0.3)" },
    yellow: { dot: "hsl(38, 80%, 55%)", glow: "hsla(38, 80%, 55%, 0.3)" },
    green: { dot: "hsl(152, 50%, 48%)", glow: "hsla(152, 50%, 48%, 0.3)" },
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
    const showAdditionalCard = (profile.mood ?? 5) <= 3;

    // F1 timeline inputs
    const [f1GradStatus, setF1GradStatus] = useState<"graduated" | "not_graduated" | null>(
        profile.gradDate ? (new Date(profile.gradDate) <= new Date() ? "graduated" : "not_graduated") : null
    );
    const [gradInput, setGradInput] = useState(profile.gradDate ?? "");
    const [optStartInput, setOptStartInput] = useState(profile.optEndDate ?? "");

    if (!profile.visaType) return null;

    // ── Data ────────────────────────────────────────────────────────────────────
    const allNews = newsData as NewsItem[];
    const relevantNews = allNews.filter((n) => n.affectedVisas.includes(profile.visaType!))
        .sort((a, b) => {
            if (a.severity === "red" && b.severity !== "red") return -1;
            if (a.severity !== "red" && b.severity === "red") return 1;
            if (a.severity === "yellow" && b.severity === "green") return -1;
            if (a.severity === "green" && b.severity === "yellow") return 1;
            return 0;
        });
    const redCount = relevantNews.filter((n) => n.severity === "red").length;
    const recentNews = relevantNews.slice(0, 3);

    const orbState = getOrbState(redCount, moodSelected);
    const orb = ORB_CONFIG[orbState];
    const orbStyle = ORB_STYLES[orbState];

    // F1 timeline
    const f1Status = detectF1Status(gradInput || null, optStartInput || null);
    let timeline: TimelineEvent[] = [];
    if (profile.visaType === "F1" && gradInput) {
        if (f1Status === "not_graduated") timeline = buildNotGraduatedTimeline(gradInput);
        else if (f1Status === "opt") timeline = buildOPTTimeline(gradInput, optStartInput || null);
        else if (f1Status === "stem_opt") timeline = buildSTEMOptTimeline(gradInput, optStartInput || null);
    }

    const nextUpcoming = timeline.find((e) => daysUntil(e.date) >= 0);

    const stateNote = profile.state === "California"
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
        setProfile({ ...profile, optEndDate: val || null });
    }

    function dotColorStyle(days: number) {
        if (days < 0) return { bg: "var(--text-muted)", glow: "transparent" };
        if (days < 30) return { bg: "hsl(0, 60%, 55%)", glow: "hsla(0, 60%, 55%, 0.3)" };
        if (days < 90) return { bg: "hsl(38, 80%, 55%)", glow: "hsla(38, 80%, 55%, 0.3)" };
        return { bg: "hsl(152, 50%, 48%)", glow: "hsla(152, 50%, 48%, 0.3)" };
    }

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-24">

            {/* Profile strip */}
            <div className="flex items-center justify-between animate-float-in stagger-1">
                <div>
                    <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Your profile</p>
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        {profile.visaType} · {profile.state || "All states"}
                        {stateNote && (
                            <span className="ml-2 text-xs font-normal" style={{ color: "var(--accent-safe)" }}>
                                ✓ Extra protections
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={() => router.push("/onboarding")}
                    className="glass-btn text-xs px-3 py-1.5"
                    style={{ color: "var(--text-muted)" }}
                >
                    Change profile
                </button>
            </div>

            {/* State-specific note */}
            {stateNote && (
                <div
                    className="rounded-xl px-4 py-2.5 animate-float-in stagger-2"
                    style={{
                        background: "var(--accent-safe-glow)",
                        border: "1px solid hsla(152, 50%, 48%, 0.2)",
                    }}
                >
                    <p className="text-xs" style={{ color: "var(--accent-safe)" }}>🏛️ {stateNote}</p>
                </div>
            )}

            {/* ── Breathing Orb Status Banner ─────────────────────────────── */}
            <div className="animate-float-in stagger-2">
                {orb.clickable ? (
                    <button
                        onClick={() => router.push("/news")}
                        className="w-full text-left glass-card p-6 flex items-center gap-5 transition-all duration-300 hover:scale-[1.01]"
                        style={{
                            boxShadow: `0 0 40px -10px ${orbStyle.glowColor}`,
                        }}
                    >
                        {/* Orb */}
                        <div className="relative flex-shrink-0">
                            <div
                                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl animate-breathe"
                                style={{
                                    background: orbStyle.orbGradient,
                                    boxShadow: `0 0 24px -4px ${orbStyle.glowColor}`,
                                }}
                            >
                                {orb.emoji}
                            </div>
                            <div
                                className="absolute inset-[-4px] rounded-full animate-breathe-ring"
                                style={{ border: `2px solid ${orbStyle.ringColor}` }}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span
                                className="text-xs font-bold uppercase tracking-widest"
                                style={{ color: orbStyle.statusColor }}
                            >
                                {orb.status}
                            </span>
                            <h2 className="text-lg font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>
                                {orb.label}
                            </h2>
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                                {orb.subLabel(profile.visaType, redCount)}
                            </p>
                        </div>
                        <span style={{ color: "var(--text-muted)" }}>→</span>
                    </button>
                ) : (
                    <div
                        className="glass-card p-6 flex items-center gap-5"
                        style={{
                            boxShadow: `0 0 40px -10px ${orbStyle.glowColor}`,
                        }}
                    >
                        {/* Orb */}
                        <div className="relative flex-shrink-0">
                            <div
                                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl animate-breathe"
                                style={{
                                    background: orbStyle.orbGradient,
                                    boxShadow: `0 0 24px -4px ${orbStyle.glowColor}`,
                                }}
                            >
                                {orb.emoji}
                            </div>
                            <div
                                className="absolute inset-[-4px] rounded-full animate-breathe-ring"
                                style={{ border: `2px solid ${orbStyle.ringColor}` }}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span
                                className="text-xs font-bold uppercase tracking-widest"
                                style={{ color: orbStyle.statusColor }}
                            >
                                {orb.status}
                            </span>
                            <h2 className="text-lg font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>
                                {orb.label}
                            </h2>
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                                {orb.subLabel(profile.visaType, redCount)}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Stats row ──────────────────────────────────────────────── */}
            <div className={`grid gap-3 ${profile.visaType === "F1" ? "grid-cols-3" : "grid-cols-2"}`}>
                <div className="glass-card-sm px-4 py-3.5 animate-float-in stagger-3">
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Active alerts</p>
                    <p
                        className="text-xl font-bold"
                        style={{ color: redCount > 0 ? "hsl(0, 60%, 65%)" : "var(--accent-safe)" }}
                    >
                        {redCount === 0 ? "None" : String(redCount)}
                    </p>
                </div>
                {profile.visaType === "F1" && (
                    <div className="glass-card-sm px-4 py-3.5 animate-float-in stagger-4">
                        <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Next deadline</p>
                        <p
                            className="text-xl font-bold"
                            style={{
                                color: nextUpcoming && daysUntil(nextUpcoming.date) < 30
                                    ? "hsl(0, 60%, 65%)" : "var(--text-primary)"
                            }}
                        >
                            {nextUpcoming ? `${daysUntil(nextUpcoming.date)}d` : "—"}
                        </p>
                    </div>
                )}
                <div className="glass-card-sm px-4 py-3.5 animate-float-in stagger-5">
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Visa status</p>
                    <p className="text-xl font-bold" style={{ color: "var(--accent-safe)" }}>Active</p>
                </div>
            </div>

            {/* ── Mood check-in ──────────────────────────────────────────── */}
            <div className="glass-card p-5 animate-float-in stagger-4">
                <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                    How are you feeling today?
                </p>
                <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                    About your immigration situation
                </p>

                <div className="flex gap-2 justify-between">
                    {MOODS.map((m) => (
                        <button
                            key={m.score}
                            onClick={() => handleMood(m.score)}
                            className="flex-1 flex flex-col items-center py-3 rounded-xl transition-all duration-300"
                            style={{
                                background: moodSelected === m.score
                                    ? "var(--accent-calm-glow)" : "var(--bg-elevated)",
                                border: moodSelected === m.score
                                    ? "2px solid var(--accent-calm)" : "2px solid var(--glass-border)",
                                boxShadow: moodSelected === m.score
                                    ? "0 0 16px -4px var(--accent-calm-glow)" : "none",
                            }}
                        >
                            <span className="text-xl">{m.emoji}</span>
                            <span className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{m.label}</span>
                        </button>
                    ))}
                </div>

                {moodSubmitted && moodSelected && (
                    <div
                        className="mt-4 rounded-xl px-4 py-3 animate-float-in"
                        style={{
                            background: "var(--accent-calm-glow2)",
                            border: "1px solid hsla(168, 55%, 42%, 0.15)",
                        }}
                    >
                        <p className="text-sm" style={{ color: "var(--accent-calm-light)" }}>
                            {moodMessage(moodSelected)}
                        </p>
                    </div>
                )}

                {/* Community support — shown when mood is low */}
                {showAdditionalCard && (
                    <div
                        className="mt-3 rounded-xl p-4 animate-float-in"
                        style={{
                            background: "hsla(270, 50%, 50%, 0.06)",
                            border: "1px solid hsla(270, 50%, 50%, 0.15)",
                        }}
                    >
                        {(profile.mood ?? 5) === 3 && (
                            <p className="text-sm font-medium mb-1" style={{ color: "hsl(270, 50%, 72%)" }}>
                                You&apos;re not alone in this journey. Join these communities to stay up to date and connect with peers.
                            </p>
                        )}
                        {(profile.mood ?? 5) <= 2 && (
                            <>
                                <p className="text-sm font-medium mb-1" style={{ color: "hsl(270, 50%, 72%)" }}>
                                    Would you like to talk with someone?
                                </p>
                                <p className="text-xs mb-3" style={{ color: "hsla(270, 50%, 65%, 0.7)" }}>
                                    Connecting with a peer who&apos;s navigated the same visa journey can really help.
                                </p>
                            </>
                        )}
                        <div className="flex gap-2 flex-wrap">
                            <a
                                href={profile.visaType === "H1B" ? "https://www.reddit.com/r/h1b" : "https://www.reddit.com/r/f1visa"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary text-center text-xs py-2 px-3.5 flex-1"
                            >
                                {profile.visaType === "H1B" ? "r/H1B community →" : "r/F1visa community →"}
                            </a>
                            <a
                                href="https://www.reddit.com/r/immigration"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="glass-btn text-center text-xs py-2 px-3.5 flex-1"
                                style={{ color: "var(--text-secondary)" }}
                            >
                                r/Immigration →
                            </a>
                            {(profile.mood ?? 5) <= 2 && (
                                <a
                                    href="https://www.mentorcruise.com/filter/immigration/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-primary text-center text-xs py-2 px-3.5 flex-1"
                                    style={{
                                        background: "linear-gradient(135deg, hsl(152, 50%, 45%), hsl(152, 50%, 35%))",
                                    }}
                                >
                                    Find a mentor →
                                </a>
                            )}
                            {(profile.mood ?? 5) <= 1 && (
                                <a
                                    href={profile.state
                                        ? `https://www.bestlawyers.com/united-states/${profile.state.toLowerCase().replace(" ", "-")}`
                                        : "https://www.bestlawyers.com/united-states/"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-primary text-center text-xs py-2 px-3.5 flex-1"
                                    style={{
                                        background: "linear-gradient(135deg, hsl(152, 50%, 45%), hsl(152, 50%, 35%))",
                                    }}
                                >
                                    Find a lawyer in {profile.state || "US"} →
                                </a>
                            )}
                        </div>
                        <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>
                            Select a calmer mood above to dismiss
                        </p>
                    </div>
                )}
            </div>

            {/* ── F1 Timeline ────────────────────────────────────────────── */}
            {profile.visaType === "F1" && (
                <div className="glass-card p-5 animate-float-in stagger-5">
                    <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                        F-1 key dates
                    </p>
                    <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                        Track your OPT and STEM OPT deadlines
                    </p>

                    {/* Graduated toggle */}
                    <div className="flex gap-2 mb-4">
                        {(["not_graduated", "graduated"] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setF1GradStatus(status)}
                                className="flex-1 py-2.5 text-sm rounded-xl font-medium transition-all duration-300"
                                style={{
                                    background: f1GradStatus === status ? "var(--accent-calm-glow)" : "var(--bg-elevated)",
                                    border: f1GradStatus === status
                                        ? "2px solid var(--accent-calm)" : "2px solid var(--glass-border)",
                                    color: f1GradStatus === status
                                        ? "var(--accent-calm-light)" : "var(--text-secondary)",
                                }}
                            >
                                {status === "not_graduated" ? "🎓 Not yet graduated" : "✅ Graduated"}
                            </button>
                        ))}
                    </div>

                    {/* Inputs */}
                    {f1GradStatus === "not_graduated" && (
                        <div className="flex items-center gap-3 mb-5">
                            <label className="text-sm min-w-max" style={{ color: "var(--text-secondary)" }}>
                                Expected graduation
                            </label>
                            <input
                                type="date"
                                value={gradInput}
                                onChange={(e) => handleGradInput(e.target.value)}
                                className="flex-1 px-3 py-2 text-sm rounded-lg"
                            />
                        </div>
                    )}

                    {f1GradStatus === "graduated" && (
                        <div className="space-y-3 mb-5">
                            <div className="flex items-center gap-3">
                                <label className="text-sm min-w-max" style={{ color: "var(--text-secondary)" }}>
                                    Graduation date
                                </label>
                                <input
                                    type="date"
                                    value={gradInput}
                                    onChange={(e) => handleGradInput(e.target.value)}
                                    className="flex-1 px-3 py-2 text-sm rounded-lg"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-sm min-w-max" style={{ color: "var(--text-secondary)" }}>
                                    OPT start date
                                </label>
                                <input
                                    type="date"
                                    value={optStartInput}
                                    onChange={(e) => handleOptStartInput(e.target.value)}
                                    className="flex-1 px-3 py-2 text-sm rounded-lg"
                                />
                            </div>
                            {gradInput && !optStartInput && (
                                <div
                                    className="rounded-lg px-3 py-2 animate-float-in"
                                    style={{
                                        background: "var(--accent-watch-glow)",
                                        border: "1px solid hsla(38, 80%, 55%, 0.2)",
                                    }}
                                >
                                    <p className="text-xs" style={{ color: "hsl(38, 80%, 65%)" }}>
                                        💡 If OPT hasn&apos;t started yet, you can leave OPT start date blank — we&apos;ll estimate from your graduation date.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Status badge */}
                    {f1GradStatus && gradInput && (
                        <div className="mb-4 flex items-center gap-2">
                            <span
                                className="chip"
                                style={{
                                    background: f1Status === "not_graduated"
                                        ? "var(--accent-calm-glow)" : f1Status === "opt"
                                            ? "var(--accent-safe-glow)" : "hsla(270, 50%, 50%, 0.1)",
                                    borderColor: f1Status === "not_graduated"
                                        ? "var(--accent-calm)" : f1Status === "opt"
                                            ? "hsla(152, 50%, 48%, 0.3)" : "hsla(270, 50%, 50%, 0.2)",
                                    color: f1Status === "not_graduated"
                                        ? "var(--accent-calm-light)" : f1Status === "opt"
                                            ? "var(--accent-safe)" : "hsl(270, 50%, 72%)",
                                }}
                            >
                                {f1Status === "not_graduated" ? "📚 Pre-graduation"
                                    : f1Status === "opt" ? "💼 On OPT"
                                        : f1Status === "stem_opt" ? "🔬 On STEM OPT" : "—"}
                            </span>
                        </div>
                    )}

                    {/* Timeline */}
                    {timeline.length === 0 ? (
                        <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
                            {f1GradStatus
                                ? "Enter your dates above to see your immigration timeline."
                                : "Select your graduation status above to get started."}
                        </p>
                    ) : (
                        <div className="space-y-0">
                            {timeline.map((event, i) => {
                                const days = daysUntil(event.date);
                                const isPast = days < 0;
                                const dc = dotColorStyle(days);
                                return (
                                    <div key={event.label} className="flex gap-3">
                                        <div className="flex flex-col items-center">
                                            <div
                                                className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                                                style={{
                                                    background: dc.bg,
                                                    boxShadow: !isPast ? `0 0 8px ${dc.glow}` : "none",
                                                }}
                                            />
                                            {i < timeline.length - 1 && (
                                                <div
                                                    className="w-px flex-1 my-1"
                                                    style={{ background: "var(--glass-border)" }}
                                                />
                                            )}
                                        </div>
                                        <div className={`pb-4 flex-1 min-w-0 ${isPast ? "opacity-40" : ""}`}>
                                            <div className="flex items-center flex-wrap gap-2">
                                                <span
                                                    className="text-sm font-medium"
                                                    style={{ color: isPast ? "var(--text-muted)" : "var(--text-primary)" }}
                                                >
                                                    {typeIcon(event.type)} {event.label}
                                                </span>
                                                {/* Countdown badge */}
                                                <span
                                                    className="chip text-xs"
                                                    style={{
                                                        background: days < 0 ? "var(--bg-elevated)"
                                                            : days < 30 ? "hsla(0, 60%, 55%, 0.1)"
                                                                : days < 90 ? "var(--accent-watch-glow)"
                                                                    : "var(--accent-safe-glow)",
                                                        borderColor: days < 0 ? "var(--glass-border)"
                                                            : days < 30 ? "hsla(0, 60%, 55%, 0.2)"
                                                                : days < 90 ? "hsla(38, 80%, 55%, 0.2)"
                                                                    : "hsla(152, 50%, 48%, 0.2)",
                                                        color: days < 0 ? "var(--text-muted)"
                                                            : days < 30 ? "hsl(0, 60%, 65%)"
                                                                : days < 90 ? "hsl(38, 80%, 65%)"
                                                                    : "var(--accent-safe)",
                                                    }}
                                                >
                                                    {days < 0 ? `${Math.abs(days)}d ago`
                                                        : days < 30 ? `⚡ ${days}d left`
                                                            : `${days}d away`}
                                                </span>
                                            </div>
                                            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                                {fmtDate(event.date)}
                                            </p>
                                            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                                                {event.note}
                                            </p>
                                            {event.link && (
                                                <a
                                                    href={event.link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs mt-1 inline-block font-medium"
                                                    style={{ color: "var(--accent-calm-light)" }}
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

            {/* ── News summary ───────────────────────────────────────────── */}
            <div className="glass-card p-5 animate-float-in stagger-6">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        Recent updates for you
                    </p>
                    <button
                        onClick={() => router.push("/news")}
                        className="text-xs font-medium transition-colors"
                        style={{ color: "var(--accent-calm-light)" }}
                    >
                        View all →
                    </button>
                </div>

                {recentNews.length === 0 ? (
                    <div className="text-center py-6">
                        <span className="text-3xl">✅</span>
                        <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
                            No updates affecting you right now
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recentNews.map((item) => {
                            const sev = SEV_COLORS[item.severity] ?? { dot: "var(--text-muted)", glow: "transparent" };
                            return (
                                <div key={item.id} className="flex gap-3 items-start group">
                                    <div
                                        className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${item.severity === "red" ? "animate-pulse-dot" : ""}`}
                                        style={{
                                            background: sev.dot,
                                            boxShadow: `0 0 6px ${sev.glow}`,
                                        }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm leading-snug" style={{ color: "var(--text-primary)" }}>
                                            {item.title}
                                        </p>
                                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                            {item.affectMessage} · {item.date}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => router.push(`/chatbot?newsId=${item.id}`)}
                                        className="text-xs flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity font-medium"
                                        style={{ color: "var(--accent-calm-light)" }}
                                    >
                                        Ask AI
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer */}
            <p className="text-center text-xs pb-2" style={{ color: "var(--text-muted)" }}>
                All updates sourced from official government sources only.
                Not legal advice — consult an attorney for your specific situation.
            </p>

        </div>
    );
}