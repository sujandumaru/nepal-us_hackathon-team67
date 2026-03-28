import { NextRequest, NextResponse } from "next/server";

const MOCK_MODE = !process.env.ANTHROPIC_API_KEY;

export async function POST(req: NextRequest) {
    const { messages, newsContext, userProfile } = await req.json();

    // ── MOCK MODE (no API key yet) ──────────────────────────────
    if (MOCK_MODE) {
        await new Promise((r) => setTimeout(r, 800)); // fake delay
        return NextResponse.json({
            reply: `[Mock Mode] You asked: "${messages.at(-1)?.content}"\n\nOnce you add your ANTHROPIC_API_KEY to .env.local, I'll give real answers scoped to this news update about "${newsContext?.title}".`,
        });
    }

    // ── REAL MODE (Anthropic API) ───────────────────────────────
    const systemPrompt = `You are ImmiCalm's immigration assistant. You are helpful, calm, and reassuring.

You ONLY answer questions related to the following news update. If the user asks anything unrelated to this specific update or immigration in general, politely redirect them.

NEWS UPDATE CONTEXT:
Title: ${newsContext?.title}
Source: ${newsContext?.source}
Date: ${newsContext?.date}
Summary: ${newsContext?.summary}
Tags: ${newsContext?.tags?.join(", ")}

USER PROFILE:
Visa Type: ${userProfile?.visaType}
State: ${userProfile?.state}

STRICT RULES:
1. Only discuss topics related to this news update
2. Never give specific legal advice — always recommend consulting a certified immigration lawyer for personal cases
3. Keep answers concise, clear, and anxiety-reducing
4. If unsure, say so honestly and suggest official sources (USCIS, DHS)
5. Always end with a reassurance if the user seems anxious`;

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