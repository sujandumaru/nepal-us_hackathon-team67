"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
    const [phase, setPhase] = useState<"logo" | "text" | "motto" | "fade">("logo");

    useEffect(() => {
        const t1 = setTimeout(() => setPhase("text"), 600);
        const t2 = setTimeout(() => setPhase("motto"), 1400);
        const t3 = setTimeout(() => setPhase("fade"), 3200);
        const t4 = setTimeout(() => onFinish(), 3800);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
    }, [onFinish]);

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
            style={{
                background: "var(--bg-deep)",
                opacity: phase === "fade" ? 0 : 1,
                transition: "opacity 0.6s ease-out",
            }}
        >
            {/* Ambient background glow */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `
                        radial-gradient(ellipse 60% 50% at 50% 40%, hsla(168, 55%, 42%, 0.08), transparent),
                        radial-gradient(ellipse 40% 30% at 20% 80%, hsla(222, 40%, 25%, 0.4), transparent),
                        radial-gradient(ellipse 40% 30% at 80% 20%, hsla(168, 40%, 20%, 0.2), transparent)
                    `,
                }}
            />

            {/* Radial glow behind logo */}
            <div
                className="absolute"
                style={{
                    width: "300px",
                    height: "300px",
                    background: "radial-gradient(circle, hsla(168, 55%, 42%, 0.12), transparent 70%)",
                    filter: "blur(40px)",
                    opacity: phase === "logo" ? 0 : 1,
                    transition: "opacity 1s ease-out",
                }}
            />

            {/* Logo */}
            <div
                className="relative z-10"
                style={{
                    transform: phase === "logo" ? "scale(0.8)" : "scale(1)",
                    opacity: phase === "logo" ? 0 : 1,
                    transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
            >
                <div className="relative">
                    <Image
                        src="/logo.png"
                        alt="ImmiCalm"
                        width={120}
                        height={120}
                        className="rounded-3xl"
                        style={{
                            boxShadow: "0 0 60px -10px hsla(168, 55%, 42%, 0.25)",
                        }}
                        priority
                    />
                    {/* Breathing ring */}
                    <div
                        className="absolute inset-[-8px] rounded-[28px]"
                        style={{
                            border: "2px solid hsla(168, 55%, 42%, 0.2)",
                            animation: phase !== "logo" ? "breathe-ring 4s ease-in-out infinite" : "none",
                        }}
                    />
                </div>
            </div>

            {/* App name */}
            <div
                className="relative z-10 mt-8 text-center"
                style={{
                    transform: phase === "logo" || phase === "text" ? "translateY(8px)" : "translateY(0)",
                    opacity: ["text", "motto", "fade"].includes(phase) ? 1 : 0,
                    transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                    transitionDelay: "0.1s",
                }}
            >
                <h1 className="text-4xl font-bold tracking-tight">
                    <span style={{ color: "var(--accent-calm-light)" }}>Immi</span>
                    <span style={{ color: "var(--text-primary)" }}>Calm</span>
                </h1>
            </div>

            {/* Motto */}
            <div
                className="relative z-10 mt-6 max-w-xs text-center px-4"
                style={{
                    opacity: phase === "motto" || phase === "fade" ? 1 : 0,
                    transform: phase === "motto" || phase === "fade" ? "translateY(0)" : "translateY(12px)",
                    transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
            >
                <p
                    className="text-base font-light leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                >
                    Your visa is a bridge, not a burden.
                </p>
                <p
                    className="text-sm mt-2 font-light"
                    style={{ color: "var(--text-muted)" }}
                >
                    Focus on the opportunity. We&apos;ll handle the noise.
                </p>
            </div>

            {/* Bottom tagline — fades in last */}
            <div
                className="absolute bottom-10 text-center"
                style={{
                    opacity: phase === "motto" || phase === "fade" ? 0.5 : 0,
                    transition: "opacity 0.8s ease",
                    transitionDelay: "0.4s",
                }}
            >
                <p className="text-xs tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
                    Verified updates · Zero panic
                </p>
            </div>
        </div>
    );
}
