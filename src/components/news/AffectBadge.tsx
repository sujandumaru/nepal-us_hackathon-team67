type Severity = "green" | "yellow" | "red";

const config = {
    green: {
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-700",
        icon: "🟢",
    },
    yellow: {
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-700",
        icon: "🟡",
    },
    red: {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
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
            <span className="text-sm">{c.icon}</span>
            <span className={`text-sm font-medium ${c.text}`}>{message}</span>
        </div>
    );
}