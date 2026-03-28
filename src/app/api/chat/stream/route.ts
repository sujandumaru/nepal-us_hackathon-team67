import { NextRequest, NextResponse } from "next/server";

const CHATBOT_API_BASE =
    process.env.CHATBOT_API_BASE ?? "http://127.0.0.1:8000";

type IncomingMessage = {
    role: "user" | "assistant";
    content: string;
};

type NewsContext = {
    id?: string;
    title?: string;
    summary?: string;
    source?: string;
    sourceUrl?: string;
    date?: string;
    tags?: string[];
    affectedVisas?: string[];
    affectedStates?: string[];
    severity?: string;
    affectMessage?: string;
    mythBuster?: boolean;
    mythClaim?: string;
    mythFact?: string;
    content?: string;
    articleContent?: string;
    body?: string;
};

const ARTICLE_CONTEXT_CHAR_LIMIT = 16000;

function buildArticleContext(newsContext: NewsContext): string {
    const fullArticleText =
        newsContext.articleContent ??
        newsContext.content ??
        newsContext.body ??
        "";

    const structured = [
        `Article ID: ${newsContext.id ?? "unknown"}`,
        `Title: ${newsContext.title ?? "unknown"}`,
        `Source: ${newsContext.source ?? "unknown"}`,
        `Source URL: ${newsContext.sourceUrl ?? "unknown"}`,
        `Date: ${newsContext.date ?? "unknown"}`,
        `Summary: ${newsContext.summary ?? ""}`,
        `Severity: ${newsContext.severity ?? "unknown"}`,
        `Affect message: ${newsContext.affectMessage ?? ""}`,
        `Affected visas: ${newsContext.affectedVisas?.join(", ") ?? ""}`,
        `Affected states: ${newsContext.affectedStates?.join(", ") ?? ""}`,
        `Tags: ${newsContext.tags?.join(", ") ?? ""}`,
        newsContext.mythBuster
            ? `Myth claim: ${newsContext.mythClaim ?? ""}`
            : "",
        newsContext.mythBuster
            ? `Myth fact: ${newsContext.mythFact ?? ""}`
            : "",
    ]
        .filter(Boolean)
        .join("\n");

    if (!fullArticleText.trim()) {
        return structured;
    }

    const maybeTruncated =
        fullArticleText.length > ARTICLE_CONTEXT_CHAR_LIMIT
            ? `${fullArticleText.slice(0, ARTICLE_CONTEXT_CHAR_LIMIT)}\n\n[Truncated due to context limit.]`
            : fullArticleText;

    return `${structured}\n\nFull article text:\n${maybeTruncated}`;
}

function buildQuestion(
    messages: IncomingMessage[],
    newsContext?: NewsContext,
    userProfile?: {
        visaType?: string;
        state?: string;
    },
): string {
    const latestUserQuestion =
        [...messages]
            .reverse()
            .find((m) => m.role === "user")
            ?.content?.trim() ?? "";

    const profileLine = userProfile?.visaType
        ? `User profile: visa type ${userProfile.visaType}${userProfile.state ? `, state ${userProfile.state}` : ""}.`
        : "";

    const isArticleMode = Boolean(newsContext?.id || newsContext?.title);
    const modeLine = isArticleMode
        ? "Conversation mode: ARTICLE_SPECIFIC. Prioritize this article context. If additional facts are needed, clearly mark them as external context."
        : "Conversation mode: GENERAL_QA. Answer using visa assistant knowledge and retrieval context.";

    const articleContext = isArticleMode
        ? buildArticleContext(newsContext!)
        : "";

    const history = messages
        .slice(-6)
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n");

    return [
        modeLine,
        profileLine,
        articleContext ? "Article context:\n" + articleContext : "",
        "Conversation history:",
        history,
        "Current user question:",
        latestUserQuestion,
    ]
        .filter(Boolean)
        .join("\n\n");
}

export async function POST(req: NextRequest) {
    const { messages, newsContext, userProfile } = await req.json();

    try {
        const question = buildQuestion(messages, newsContext, userProfile);

        const response = await fetch(`${CHATBOT_API_BASE}/api/chat/stream`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "text/event-stream",
            },
            body: JSON.stringify({ question }),
        });

        if (!response.ok || !response.body) {
            const detail = await response.text();
            return NextResponse.json(
                { error: "Chatbot streaming backend failed.", detail },
                { status: response.status || 500 },
            );
        }

        return new Response(response.body, {
            status: 200,
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
                "X-Accel-Buffering": "no",
            },
        });
    } catch (err) {
        console.error("Chatbot stream proxy error:", err);
        return NextResponse.json(
            { error: "Something went wrong while streaming chatbot response." },
            { status: 500 },
        );
    }
}
