"use client";

import { usePathname } from "next/navigation";
import Nav from "@/components/Nav";
import AskAIButton from "@/components/AskAIButton";

// Pages that should NOT show the nav (full-screen flows)
const HIDDEN_ON = ["/", "/onboarding", "/chatbot"];

export default function NavWrapper() {
    const pathname = usePathname();
    const hide = HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(p + "?"));
    if (hide) return null;
    return (
        <>
            <Nav />
            <AskAIButton />
        </>
    );
}