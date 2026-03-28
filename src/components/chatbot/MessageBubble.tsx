type Message = {
    role: "user" | "assistant";
    content: string;
};

export default function MessageBubble({ message }: { message: Message }) {
    const isUser = message.role === "user";

    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
            <div className={`flex items-end gap-2 max-w-[85%] ${isUser ? "flex-row-reverse" : ""}`}>

                {/* Avatar */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${isUser ? "bg-blue-600" : "bg-gray-700"
                    }`}>
                    {isUser ? "👤" : "🕊️"}
                </div>

                {/* Bubble */}
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${isUser
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-gray-800 text-gray-200 rounded-bl-sm"
                    }`}>
                    {message.content}
                </div>

            </div>
        </div>
    );
}