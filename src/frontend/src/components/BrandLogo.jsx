export function BrandIcon({ size = 36, className = "" }) {
  return (
    <div
      className={`sb-brand-icon-img ${className}`.trim()}
      style={{
        width: size,
        height: size,
        borderRadius: "10px",
        background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 50%, #06b6d4 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(99, 102, 241, 0.35)",
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="6" cy="6" r="2.5" fill="#ffffff" fillOpacity="0.25" />
        <circle cx="6" cy="18" r="2.5" fill="#ffffff" fillOpacity="0.25" />
        <circle cx="18" cy="12" r="2.5" fill="#ffffff" fillOpacity="0.25" />
        <path d="M8.5 6h3.5a3 3 0 0 1 3 3v3" />
        <path d="M8.5 18h3.5a3 3 0 0 0 3-3v-3" />
      </svg>
    </div>
  );
}

export function BrandLogo({
  iconSize = 34,
  showSub = true,
  subText = "Orchestration Engine",
  className = "",
}) {
  return (
    <div className={`sb-brand-wrap ${className}`.trim()}>
      <BrandIcon size={iconSize} />
      <div className="sb-brand-text">
        <div className="sb-brand-name">
          <span className="brand-primary">Nexus</span>
          <span className="brand-accent">DAG</span>
        </div>
        {showSub && (
          <div className="sb-brand-sub">
            <span className="brand-sub-dot" aria-hidden="true" />
            <span>{subText}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default BrandLogo;
