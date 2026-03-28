"use client";

import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import newsData from "@/data/news.json";
import { NewsItem } from "@/components/news/NewsCard";

export default function Nav() {
    const router = useRouter();
    const pathname = usePathname();
    const { profile } = useUser();

    const relevantRed = (newsData as NewsItem[]).filter(
        (n) => n.severity === "red" && profile.visaType && n.affectedVisas.includes(profile.visaType)
    ).length;
    const moodScore = profile.mood ?? 5;

    const dotColor =
        relevantRed > 0 ? "#A32D2D"
            : moodScore <= 2 ? "#BA7517"
                : "#3B6D11";

    const tabs = [
        { label: "Dashboard", href: "/dashboard" },
        { label: "News", href: "/news" },
        { label: "Myth Buster", href: "/mythbuster" },
    ];

    return (
        <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 flex items-center justify-between px-6 h-14">
            <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-2 font-semibold text-gray-900 text-base hover:opacity-80 transition-opacity"
            >
                <span
                    className="w-2.5 h-2.5 rounded-full transition-colors duration-500"
                    style={{ backgroundColor: dotColor }}
                />
                ImmiCalm
            </button>

            <div className="flex gap-1">
                {tabs.map((tab) => {
                    const active = pathname === tab.href || pathname.startsWith(tab.href + "?");
                    return (
                        <button
                            key={tab.href}
                            onClick={() => router.push(tab.href)}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${active
                                ? "bg-gray-100 text-gray-900 font-medium"
                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                                }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}