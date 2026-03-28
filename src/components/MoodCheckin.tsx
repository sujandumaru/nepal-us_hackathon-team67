"use client";

import { useState } from "react";
import { useUser } from "@/lib/userContext";

const moods = [
    { score: 1, emoji: "😰", label: "Very anxious" },
    { score: 2, emoji: "😟", label: "Worried" },
    { score: 3, emoji: "😐", label: "Neutral" },
    { score: 4, emoji: "🙂", label: "Okay" },
    { score: 5, emoji: "😌", label: "Calm" },
];

export default function MoodCheckin() {
    const { profile, setProfile } = useUser();
    const [selected, setSelected] = useState<number | null>(profile.mood);
    const [submitted, setSubmitted] = useState(!!profile.mood);

    const handleSelect = (score: number) => {
        setSelected(score);
        setProfile({ ...profile, mood: score });
        setSubmitted(true);
    };

    const getMessage = (score: number) => {
        if (score <= 2) return "We've got you. Only verified, relevant updates below. 💙";
        if (score === 3) return "Stay informed, stay grounded. Here's what matters to you.";
        return "Great headspace! Here's your daily immigration summary.";
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <div>
                <h2 className="text-white font-semibold">How are you feeling today?</h2>
                <p className="text-gray-500 text-sm">About your immigration situation</p>
            </div>

            <div className="flex justify-between gap-2">
                {moods.map((mood) => (
                    <button
                        key={mood.score}
                        onClick={() => handleSelect(mood.score)}
                        className={`flex-1 flex flex-col items-center py-3 rounded-xl border-2 transition-all ${selected === mood.score
                                ? "border-blue-500 bg-blue-500/10"
                                : "border-gray-700 hover:border-gray-500"
                            }`}
                    >
                        <span className="text-2xl">{mood.emoji}</span>
                        <span className="text-xs text-gray-500 mt-1 hidden sm:block">
                            {mood.label}
                        </span>
                    </button>
                ))}
            </div>

            {submitted && selected && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
                    <p className="text-blue-300 text-sm">{getMessage(selected)}</p>
                </div>
            )}
        </div>
    );
}