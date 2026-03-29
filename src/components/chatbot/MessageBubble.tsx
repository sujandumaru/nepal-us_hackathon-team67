import Image from "next/image";

type Message = {
    role: "user" | "assistant";
    content: string;
};

export default function MessageBubble({ message }: { message: Message }) {
    const isUser = message.role === "user";

    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-float-in`}>
            <div className={`flex items-end gap-2.5 max-w-[85%] ${isUser ? "flex-row-reverse" : ""}`}>

                {/* Avatar */}
                <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                    style={{
                        background: isUser
                            ? "linear-gradient(135deg, var(--accent-calm), hsl(168, 60%, 36%))"
                            : "var(--bg-elevated)",
                        border: isUser ? "none" : "1px solid var(--glass-border)",
                    }}
                >
                    {isUser ? "👤" : <Image src="/logo.png" alt="ImmiCalm" width={18} height={18} className="rounded" />}
                </div>

                {/* Bubble */}
                <div
                    className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                    style={{
                        background: isUser
                            ? "linear-gradient(135deg, var(--accent-calm), hsl(168, 60%, 34%))"
                            : "var(--glass-bg)",
                        color: isUser ? "white" : "var(--text-secondary)",
                        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        border: isUser ? "none" : "1px solid var(--glass-border)",
                        backdropFilter: isUser ? "none" : "blur(12px)",
                    }}
                >
                    {message.content}
                </div>

            </div>
        </div>
    );
}