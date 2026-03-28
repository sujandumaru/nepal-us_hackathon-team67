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

export default function OnboardingPage() {
    const { setProfile } = useUser();
    const router = useRouter();
    const [visaType, setVisaType] = useState<"F1" | "H1B" | null>(null);
    const [state, setState] = useState<string>("");

    const handleContinue = () => {
        if (!visaType || !state) return;
        setProfile({ visaType, state, mood: null });
        router.push("/feed");
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6">
            <div className="max-w-md w-full space-y-8">

                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold text-black">ImmiCalm 🕊️</h1>
                    <p className="text-gray-400 text-lg">
                        Verified immigration updates. No noise. No panic.
                    </p>
                </div>

                {/* Visa Type */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-300 uppercase tracking-wider">
                        Your Visa Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {(["F1", "H1B"] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => setVisaType(type)}
                                className={`py-4 rounded-xl font-semibold text-lg transition-all border-2 ${visaType === type
                                    ? "border-blue-500 bg-blue-500/20 text-blue-300"
                                    : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500"
                                    }`}
                            >
                                {type}
                                <p className="text-xs font-normal mt-1 text-gray-500">
                                    {type === "F1" ? "Student Visa" : "Work Visa"}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* State */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-300 uppercase tracking-wider">
                        State of Residence
                    </label>
                    <select
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full bg-gray-900 border-2 border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                    >
                        <option value="">Select your state</option>
                        {US_STATES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                {/* Privacy Note */}
                <p className="text-xs text-gray-500 text-center">
                    🔒 We never store personal data. This is used only to filter relevant updates for you.
                </p>

                {/* Continue Button */}
                <button
                    onClick={handleContinue}
                    disabled={!visaType || !state}
                    className="w-full py-4 rounded-xl font-semibold text-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    Show My Updates →
                </button>

            </div>
        </div>
    );
}