// Icons copied 1:1 from the design mockups (Home/Chat/Profiles/Settings .dc.html)

type P = React.SVGProps<SVGSVGElement> & { size?: number };

const svgProps = {
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export const IcoLogo = ({ size = 20, color = "var(--on-accent)", ...p }: P & { color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth="2.4" {...svgProps} {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="m20 20-4-4" />
  </svg>
);

export const IcoHome = ({ size = 20, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" {...svgProps} {...p}>
    <path d="M3 11 12 3l9 8" />
    <path d="M5 10v10h14V10" />
  </svg>
);

export const IcoChat = ({ size = 20, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" {...svgProps} {...p}>
    <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12Z" />
  </svg>
);

export const IcoProfiles = ({ size = 20, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" {...svgProps} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </svg>
);

export const IcoDashboard = ({ size = 20, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" {...svgProps} {...p}>
    <rect x="3" y="3" width="7" height="9" rx="2" />
    <rect x="14" y="3" width="7" height="5" rx="2" />
    <rect x="14" y="12" width="7" height="9" rx="2" />
    <rect x="3" y="16" width="7" height="5" rx="2" />
  </svg>
);

export const IcoSettings = ({ size = 20, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" {...svgProps} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
  </svg>
);

export const IcoRefresh = ({ size = 18, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" {...svgProps} {...p}>
    <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

export const IcoSend = ({ size = 18, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke="var(--on-accent)" strokeWidth="2.4" {...svgProps} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const IcoPlus = ({ size = 18, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" {...svgProps} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IcoKey = ({ size = 20, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...p} {...svgProps}>
    <circle cx="7.5" cy="15.5" r="4.5" stroke="var(--accent)" strokeWidth="1.8" />
    <path d="m11 12 10-10" stroke="var(--accent)" strokeWidth="1.8" />
    <path d="m16 7 3 3" stroke="var(--accent)" strokeWidth="1.8" />
  </svg>
);

export const IcoClock = ({ size = 20, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="1.8" {...svgProps} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const IcoSun = ({ size = 20, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="1.8" {...svgProps} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
  </svg>
);

export const IcoBell = ({ size = 20, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="1.8" {...svgProps} {...p}>
    <path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z" />
    <path d="M10 21h4" />
  </svg>
);

export const IcoPeople = ({ size = 20, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="1.8" {...svgProps} {...p}>
    <circle cx="8" cy="9" r="2" />
    <circle cx="16" cy="9" r="2" />
    <circle cx="12" cy="16" r="2" />
  </svg>
);

export const IcoRotate = ({ size = 18, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="1.8" {...svgProps} {...p}>
    <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);
