"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useUser } from "@/lib/userContext";

const US_STATES = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
    "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
    "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
    "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

const NOTABLE_STATES: Record<string, string> = {
    "California": "🏛️ California has extra state-level immigrant worker protections",
};

export default function OnboardingPage() {
    const { setProfile } = useUser();
    const router = useRouter();
    const [visaType, setVisaType] = useState<"F1" | "H1B" | null>(null);
    const [state, setState] = useState<string>("");
    const [showStateInfo, setShowStateInfo] = useState(false);

    const handleContinue = () => {
        if (!visaType) return;
        setProfile({ visaType, state: state || null, mood: null, gradDate: null, optEndDate: null });
        router.push("/dashboard");
    };

    const stateNote = state ? NOTABLE_STATES[state] : null;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">

            {/* Ambient background glow */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `
                        radial-gradient(ellipse 50% 40% at 50% 30%, hsla(168, 55%, 42%, 0.06), transparent),
                        radial-gradient(ellipse 40% 30% at 20% 80%, hsla(222, 40%, 25%, 0.3), transparent),
                        radial-gradient(ellipse 40% 30% at 80% 70%, hsla(168, 40%, 20%, 0.15), transparent)
                    `,
                }}
            />

            <div className="max-w-md w-full space-y-8 relative z-10 animate-float-in">

                {/* Header */}
                <div className="text-center space-y-3">
                    {/* Logo */}
                    <div className="flex justify-center mb-4">
                        <div className="relative">
                            <Image
                                src="/logo.png"
                                alt="ImmiCalm"
                                width={80}
                                height={80}
                                className="rounded-2xl animate-breathe"
                                style={{
                                    boxShadow: "0 0 40px -8px var(--accent-calm-glow)",
                                }}
                                priority
                            />
                            <div
                                className="absolute inset-[-6px] rounded-[22px] animate-breathe-ring"
                                style={{
                                    border: "2px solid var(--accent-calm)",
                                    opacity: 0.2,
                                }}
                            />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold">
                        <span style={{ color: "var(--accent-calm-light)" }}>Immi</span>
                        <span style={{ color: "var(--text-primary)" }}>Calm</span>
                    </h1>
                    <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
                        Verified immigration updates. No noise. No panic.
                    </p>
                </div>

                {/* Visa Type */}
                <div className="space-y-3">
                    <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Your visa type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {(["F1", "H1B"] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => setVisaType(type)}
                                className="py-5 rounded-xl font-semibold text-lg transition-all duration-300"
                                style={{
                                    background: visaType === type
                                        ? "var(--accent-calm-glow)"
                                        : "var(--bg-surface)",
                                    border: visaType === type
                                        ? "2px solid var(--accent-calm)"
                                        : "2px solid var(--glass-border)",
                                    color: visaType === type
                                        ? "var(--accent-calm-light)"
                                        : "var(--text-secondary)",
                                    boxShadow: visaType === type
                                        ? "0 0 24px -4px var(--accent-calm-glow)"
                                        : "none",
                                }}
                            >
                                {type}
                                <p className="text-xs font-normal mt-1" style={{ color: "var(--text-muted)" }}>
                                    {type === "F1" ? "Student visa" : "Work visa"}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* State */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                            State of residence
                            <span className="ml-2 text-xs font-normal normal-case" style={{ color: "var(--text-muted)" }}>
                                (optional)
                            </span>
                        </label>
                        <button
                            onClick={() => setShowStateInfo((v) => !v)}
                            className="text-xs font-medium transition-colors"
                            style={{ color: "var(--accent-calm-light)" }}
                        >
                            Why?
                        </button>
                    </div>

                    {showStateInfo && (
                        <div
                            className="glass-card-sm px-4 py-3 text-xs leading-relaxed animate-float-in"
                            style={{ color: "var(--accent-calm-light)" }}
                        >
                            Some states have their own immigrant protections or policies — for example, California has extra state-level worker protections. Adding your state lets us surface those updates. It&apos;s optional and we never store it.
                        </div>
                    )}

                    <select
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl text-sm"
                        style={{
                            background: "var(--bg-elevated)",
                            border: "2px solid var(--glass-border)",
                            color: state ? "var(--text-primary)" : "var(--text-muted)",
                        }}
                    >
                        <option value="">Skip — show all updates</option>
                        {US_STATES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>

                    {stateNote && (
                        <div
                            className="rounded-xl px-4 py-2.5 animate-float-in"
                            style={{
                                background: "var(--accent-safe-glow)",
                                border: "1px solid hsla(152, 50%, 48%, 0.2)",
                            }}
                        >
                            <p className="text-xs" style={{ color: "var(--accent-safe)" }}>{stateNote}</p>
                        </div>
                    )}
                </div>

                {/* Privacy Note */}
                <div className="flex items-center justify-center gap-2">
                    <span className="text-sm">🔒</span>
                    <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                        We never store personal data. This is used only to filter relevant updates for you.
                    </p>
                </div>

                {/* Continue Button */}
                <button
                    onClick={handleContinue}
                    disabled={!visaType}
                    className="btn-primary w-full py-4 text-lg"
                >
                    Show my updates →
                </button>

            </div>
        </div>
    );
}