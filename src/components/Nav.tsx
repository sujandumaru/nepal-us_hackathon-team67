"use client";

import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
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

    const dotState =
        relevantRed > 0 ? "alert"
            : moodScore <= 2 ? "watch"
                : "calm";

    const dotColors = {
        calm: "bg-emerald-400",
        watch: "bg-amber-400",
        alert: "bg-red-400",
    };

    const tabs = [
        { label: "Dashboard", href: "/dashboard", icon: "◉" },
        { label: "News", href: "/news", icon: "◎" },
        { label: "Myth Buster", href: "/mythbuster", icon: "◈" },
    ];

    return (
        <nav className="glass-nav sticky top-0 z-50 flex items-center justify-between px-6 h-14">
            <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-2.5 font-semibold text-base hover:opacity-80 transition-opacity"
                style={{ color: "var(--text-primary)" }}
            >
                <span className="relative flex items-center justify-center">
                    <Image
                        src="/logo.png"
                        alt="ImmiCalm"
                        width={28}
                        height={28}
                        className="rounded-md"
                    />
                    <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${dotColors[dotState]} transition-colors duration-700`}
                        style={{ border: "2px solid var(--bg-deep)" }}
                    />
                </span>
                <span style={{ color: "var(--accent-calm-light)" }}>Immi</span>
                <span style={{ color: "var(--text-primary)", marginLeft: "-6px" }}>Calm</span>
            </button>

            <div className="flex gap-1">
                {tabs.map((tab) => {
                    const active = pathname === tab.href || pathname.startsWith(tab.href + "?");
                    return (
                        <button
                            key={tab.href}
                            onClick={() => router.push(tab.href)}
                            className={`px-3.5 py-1.5 rounded-lg text-sm transition-all duration-300 ${active
                                ? "font-medium"
                                : "hover:opacity-80"
                                }`}
                            style={{
                                background: active ? "var(--accent-calm-glow)" : "transparent",
                                color: active ? "var(--accent-calm-light)" : "var(--text-secondary)",
                                border: active ? "1px solid hsla(168, 55%, 42%, 0.2)" : "1px solid transparent",
                            }}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}