type Severity = "green" | "yellow" | "red";

const config = {
    green: {
        bg: "bg-green-500/20",
        border: "border-green-500/50",
        text: "text-green-400",
        icon: "🟢",
    },
    yellow: {
        bg: "bg-yellow-500/20",
        border: "border-yellow-500/50",
        text: "text-yellow-400",
        icon: "🟡",
    },
    red: {
        bg: "bg-red-500/20",
        border: "border-red-500/50",
        text: "text-red-400",
        icon: "🔴",
    },
};

export default function AffectBadge({
    severity,
    message,
}: {
    severity: Severity;
    message: string;
}) {
    const c = config[severity];
    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${c.bg} ${c.border}`}>
            <span>{c.icon}</span>
            <span className={`text-sm font-medium ${c.text}`}>{message}</span>
        </div>
    );
}