import { NextRequest, NextResponse } from "next/server";

const MOCK_MODE = !process.env.ANTHROPIC_API_KEY;

export async function POST(req: NextRequest) {
    const { messages, newsContext, userProfile, generalMode } = await req.json();

    // ── MOCK MODE ───────────────────────────────────────────────────────────────
    if (MOCK_MODE) {
        await new Promise((r) => setTimeout(r, 800));
        const q = messages.at(-1)?.content ?? "";
        if (generalMode) {
            return NextResponse.json({
                reply: `[Mock Mode — General] You asked: "${q}"\n\nOnce you add your ANTHROPIC_API_KEY to .env.local, I'll answer general ${userProfile?.visaType ?? "immigration"} questions fully.`,
            });
        }
        return NextResponse.json({
            reply: `[Mock Mode — News] You asked: "${q}"\n\nOnce you add your ANTHROPIC_API_KEY to .env.local, I'll give real answers scoped to "${newsContext?.title}".`,
        });
    }

    // ── SYSTEM PROMPT ───────────────────────────────────────────────────────────
    let systemPrompt: string;

    if (generalMode || !newsContext) {
        // General mode — broad immigration assistant, not locked to one article
        systemPrompt = `You are ImmiCalm's immigration assistant. You are helpful, calm, and reassuring.

You answer general questions about US immigration, visa status, and related topics. You are knowledgeable about F1, H1B, OPT, STEM OPT, CPT, and related visa categories.

USER PROFILE:
Visa Type: ${userProfile?.visaType ?? "unknown"}
State: ${userProfile?.state ?? "not specified"}

STRICT RULES:
1. Answer clearly and concisely — immigration jargon should be explained in plain language
2. Never give specific legal advice — always recommend consulting a certified immigration attorney for personal decisions
3. Keep answers calm and anxiety-reducing — many users are stressed about their status
4. If unsure about something, say so honestly and direct them to official sources (USCIS.gov, DHS.gov)
5. Always end with a reassurance or a suggested next step
6. Do not make up rules, deadlines, or policies — stick to what you know to be accurate`;
    } else {
        // News-specific mode — scoped to one article
        systemPrompt = `You are ImmiCalm's immigration assistant. You are helpful, calm, and reassuring.

You ONLY answer questions related to the following news update. If the user asks anything unrelated to this specific update or immigration in general, politely redirect them.

NEWS UPDATE CONTEXT:
Title: ${newsContext.title}
Source: ${newsContext.source}
Date: ${newsContext.date}
Summary: ${newsContext.summary}
Tags: ${newsContext.tags?.join(", ")}

USER PROFILE:
Visa Type: ${userProfile?.visaType}
State: ${userProfile?.state}

STRICT RULES:
1. Only discuss topics related to this news update
2. Never give specific legal advice — always recommend consulting a certified immigration lawyer for personal cases
3. Keep answers concise, clear, and anxiety-reducing
4. If unsure, say so honestly and suggest official sources (USCIS, DHS)
5. Always end with a reassurance if the user seems anxious`;
    }

    // ── REAL MODE ───────────────────────────────────────────────────────────────
    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.ANTHROPIC_API_KEY!,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1000,
                system: systemPrompt,
                messages: messages.map((m: { role: string; content: string }) => ({
                    role: m.role,
                    content: m.content,
                })),
            }),
        });

        const data = await response.json();
        const reply = data.content?.[0]?.text ?? "Sorry, I couldn't generate a response.";
        return NextResponse.json({ reply });

    } catch (err) {
        console.error("Anthropic API error:", err);
        return NextResponse.json(
            { reply: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}