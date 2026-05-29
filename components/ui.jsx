const appCardBase =
  "rounded-[20px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.35)] backdrop-blur-md transition-transform transition-colors duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]";

export function SectionTitle({ eyebrow, title, description, right, className = "" }) {
  return (
    <div className={["flex items-start justify-between gap-4", className].filter(Boolean).join(" ")}>
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-medium tracking-[0.24em] text-zinc-500">
            {eyebrow}
          </p>
        ) : null}
        {title ? <h2 className="mt-2 text-lg font-semibold tracking-tight">{title}</h2> : null}
        {description ? <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export function AppCard({
  children,
  eyebrow,
  title,
  description,
  right,
  className = "",
  contentClassName = "",
  headerClassName = "",
}) {
  const hasHeader = eyebrow || title || description || right;

  return (
    <section className={[appCardBase, className].filter(Boolean).join(" ")}>
      {hasHeader ? (
        <SectionTitle
          eyebrow={eyebrow}
          title={title}
          description={description}
          right={right}
          className={headerClassName}
        />
      ) : null}
      {children ? (
        <div className={hasHeader ? ["mt-4", contentClassName].filter(Boolean).join(" ") : contentClassName}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function XPBar({
  label = "当前 XP",
  current = 0,
  max = 100,
  valueLabel,
  className = "",
}) {
  const safeMax = Math.max(Number(max) || 1, 1);
  const safeCurrent = Math.max(Number(current) || 0, 0);
  const percent = Math.min((safeCurrent / safeMax) * 100, 100);

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-zinc-400">{label}</span>
        <span className="font-medium text-zinc-100">
          {valueLabel ?? `${safeCurrent} / ${safeMax} XP`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-white via-zinc-200 to-zinc-400"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function StatBar({ label, value = 0, className = "", accent = "from-white to-zinc-300" }) {
  const safeValue = Math.max(0, Math.min(Number(value) || 0, 100));

  return (
    <div className={["rounded-2xl border border-white/10 bg-black/30 p-3", className].filter(Boolean).join(" ")}>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-zinc-200">{label}</span>
        <span className="text-zinc-400">{safeValue}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${accent}`}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

export function StatusBadge({ variant = "neutral", children, className = "" }) {
  const variantClassMap = {
    buff: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
    debuff: "border-red-500/25 bg-red-500/10 text-red-200",
    neutral: "border-white/10 bg-black/30 text-zinc-300",
  };

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-2 text-sm transition-colors",
        variantClassMap[variant] || variantClassMap.neutral,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}

const bottomNavItems = [
  { id: "home", label: "首页", icon: "⌂" },
  { id: "record", label: "记录", icon: "▣" },
  { id: "calendar", label: "日历", icon: "□" },
  { id: "status", label: "我的", icon: "○" },
];

export function BottomNav({ activePage, onChange }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-blue-100 bg-white/95 px-5 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] pt-3 backdrop-blur-xl">
      <div className="mx-auto grid w-full max-w-md grid-cols-4 gap-2">
        {bottomNavItems.map((item) => {
          const isActive = item.id === activePage;

          return (
            <button
              key={item.id}
              className={[
                "flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-2 text-xs font-semibold transition-colors",
                isActive ? "text-[#0A8DFF]" : "text-[#0D1B33]",
              ]
                .filter(Boolean)
                .join(" ")}
              type="button"
              onClick={() => onChange(item.id)}
            >
              <span
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-xl border text-lg leading-none",
                  isActive
                    ? "border-[#0A8DFF] bg-[#0A8DFF] text-white"
                    : "border-[#0D1B33]/15 bg-white text-[#0D1B33]",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function PrimaryButton({
  children,
  type = "button",
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
}) {
  const variantClassMap = {
    primary: "bg-white text-black shadow-[0_12px_28px_rgba(255,255,255,0.12)] hover:bg-zinc-100",
    secondary:
      "border border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06]",
  };

  return (
    <button
      className={[
        "w-full rounded-2xl px-4 py-3 text-base font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variantClassMap[variant] || variantClassMap.primary,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
