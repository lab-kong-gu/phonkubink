// Lightweight inline SVG icons (no dependency). All use currentColor.
type P = { className?: string };
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const IconDashboard = ({ className }: P) => (
  <svg className={className} {...base}>
    <path d="M3 9.5 12 3l9 6.5" />
    <path d="M5 10v10h14V10" />
    <path d="M9 20v-6h6v6" />
  </svg>
);
export const IconMusic = ({ className }: P) => (
  <svg className={className} {...base}>
    <path d="M9 18V5l11-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="17" cy="16" r="3" />
  </svg>
);
export const IconTicket = ({ className }: P) => (
  <svg className={className} {...base}>
    <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" />
    <path d="M13 6v12" strokeDasharray="2 2" />
  </svg>
);
export const IconUser = ({ className }: P) => (
  <svg className={className} {...base}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </svg>
);
export const IconLogout = ({ className }: P) => (
  <svg className={className} {...base}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);
export const IconBell = ({ className }: P) => (
  <svg className={className} {...base}>
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);
export const IconSearch = ({ className }: P) => (
  <svg className={className} {...base}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
export const IconPin = ({ className }: P) => (
  <svg className={className} {...base}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
export const IconCalendar = ({ className }: P) => (
  <svg className={className} {...base}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
export const IconClock = ({ className }: P) => (
  <svg className={className} {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const IconMenu = ({ className }: P) => (
  <svg className={className} {...base}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);
export const IconClose = ({ className }: P) => (
  <svg className={className} {...base}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const IconChevronRight = ({ className }: P) => (
  <svg className={className} {...base}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);
export const IconArrowRight = ({ className }: P) => (
  <svg className={className} {...base}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const IconCheck = ({ className }: P) => (
  <svg className={className} {...base}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
export const IconShield = ({ className }: P) => (
  <svg className={className} {...base}>
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
export const IconUpload = ({ className }: P) => (
  <svg className={className} {...base}>
    <path d="M12 16V4m0 0L8 8m4-4 4 4" />
    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);
export const IconShare = ({ className }: P) => (
  <svg className={className} {...base}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
  </svg>
);
export const IconEdit = ({ className }: P) => (
  <svg className={className} {...base}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
export const IconEye = ({ className }: P) => (
  <svg className={className} {...base}>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const IconClipboard = ({ className }: P) => (
  <svg className={className} {...base}>
    <rect x="6" y="4" width="12" height="18" rx="2" />
    <path d="M9 4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
    <path d="M9 11h6M9 15h4" />
  </svg>
);
export const IconX = ({ className }: P) => (
  <svg className={className} {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15 9l-6 6M9 9l6 6" />
  </svg>
);
