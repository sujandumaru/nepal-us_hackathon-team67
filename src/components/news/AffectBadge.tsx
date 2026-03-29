type Severity = "green" | "yellow" | "red";

const config = {
    green: {
        bg: "hsla(152, 50%, 48%, 0.08)",
        border: "hsla(152, 50%, 48%, 0.2)",
        text: "hsl(152, 50%, 60%)",
        icon: "✓",
        label: "SAFE",
    },
    yellow: {
        bg: "hsla(38, 80%, 55%, 0.08)",
        border: "hsla(38, 80%, 55%, 0.2)",
        text: "hsl(38, 80%, 65%)",
        icon: "⚡",
        label: "WATCH",
    },
    red: {
        bg: "hsla(0, 60%, 55%, 0.08)",
        border: "hsla(0, 60%, 55%, 0.2)",
        text: "hsl(0, 60%, 65%)",
        icon: "⚠",
        label: "ACTION",
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
        <div
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all"
            style={{
                background: c.bg,
                border: `1px solid ${c.border}`,
            }}
        >
            <span
                className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${severity === "red" ? "animate-pulse-dot" : ""}`}
                style={{
                    color: c.text,
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                }}
            >
                {c.icon} {c.label}
            </span>
            <span className="text-sm font-medium" style={{ color: c.text }}>
                {message}
            </span>
        </div>
    );
}