"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";

const US_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

// States that currently have meaningful extra content
const NOTABLE_STATES: Record<string, string> = {
    CA: "🏛️ California has extra state-level immigrant worker protections",
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
        <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50">
            <div className="max-w-md w-full space-y-8">

                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold text-gray-900">ImmiCalm 🕊️</h1>
                    <p className="text-gray-500 text-lg">
                        Verified immigration updates. No noise. No panic.
                    </p>
                </div>

                {/* Visa Type */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Your visa type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {(["F1", "H1B"] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => setVisaType(type)}
                                className={`py-4 rounded-xl font-semibold text-lg transition-all border-2 ${visaType === type
                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                                    }`}
                            >
                                {type}
                                <p className="text-xs font-normal mt-1 text-gray-400">
                                    {type === "F1" ? "Student visa" : "Work visa"}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* State — optional with explanation */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                            State of residence
                            <span className="ml-2 text-xs font-normal normal-case text-gray-400">(optional)</span>
                        </label>
                        <button
                            onClick={() => setShowStateInfo((v) => !v)}
                            className="text-xs text-blue-400 hover:text-blue-600"
                        >
                            Why?
                        </button>
                    </div>

                    {showStateInfo && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 leading-relaxed">
                            Some states have their own immigrant protections or policies — for example, California has extra state-level worker protections. Adding your state lets us surface those updates. It's optional and we never store it.
                        </div>
                    )}

                    <select
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-blue-400 focus:outline-none"
                    >
                        <option value="">Skip — show all updates</option>
                        {US_STATES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>

                    {stateNote && (
                        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                            <p className="text-xs text-green-700">{stateNote}</p>
                        </div>
                    )}
                </div>

                {/* Privacy Note */}
                <p className="text-xs text-gray-400 text-center">
                    🔒 We never store personal data. This is used only to filter relevant updates for you.
                </p>

                {/* Continue Button */}
                <button
                    onClick={handleContinue}
                    disabled={!visaType}
                    className="w-full py-4 rounded-xl font-semibold text-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    Show my updates →
                </button>

            </div>
        </div>
    );
}