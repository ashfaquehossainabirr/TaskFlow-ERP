// Lightweight inline SVG icon set used by the Sidebar.
// Kept dependency-free (no icon package required) so the app installs and builds as-is.
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function Svg({ size = 18, children, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
      {children}
    </svg>
  );
}

export function IconDashboard(props) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13" y="3.5" width="7.5" height="4.5" rx="1.6" />
      <rect x="13" y="10" width="7.5" height="10.5" rx="1.6" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.6" />
    </Svg>
  );
}

export function IconFolder(props) {
  return (
    <Svg {...props}>
      <path d="M3.5 6.2c0-.94.76-1.7 1.7-1.7h4.2l1.9 2.2h7.4c.94 0 1.7.76 1.7 1.7v9.1c0 .94-.76 1.7-1.7 1.7H5.2c-.94 0-1.7-.76-1.7-1.7z" />
    </Svg>
  );
}

export function IconCheckSquare(props) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M7.5 12.3l3 3 6-6.6" />
    </Svg>
  );
}

export function IconColumns(props) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="4" width="5.2" height="16" rx="1.6" />
      <rect x="9.4" y="4" width="5.2" height="10.5" rx="1.6" />
      <rect x="15.3" y="4" width="5.2" height="13.5" rx="1.6" />
    </Svg>
  );
}

export function IconCalendar(props) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.2" />
      <path d="M3.5 9.6h17" />
      <path d="M8 3v4M16 3v4" />
      <circle cx="8.1" cy="13.6" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="13.6" r="1" fill="currentColor" stroke="none" />
      <circle cx="8.1" cy="17" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconCalendarCheck(props) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.2" />
      <path d="M3.5 9.6h17" />
      <path d="M8 3v4M16 3v4" />
      <path d="M8.2 14.4l2 2 4.4-4.6" />
    </Svg>
  );
}

export function IconAlarm(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="13" r="7.8" />
      <path d="M12 9.2V13l2.6 1.7" />
      <path d="M5 3.5L2.6 5.9M19 3.5l2.4 2.4" />
    </Svg>
  );
}

export function IconNotebook(props) {
  return (
    <Svg {...props}>
      <rect x="5" y="3" width="14.5" height="18" rx="2" />
      <path d="M9 8h6.5M9 12h6.5M9 16h4" />
      <path d="M5 7h-1M5 11h-1M5 15h-1" />
    </Svg>
  );
}

export function IconUsers(props) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8.3" r="3.1" />
      <path d="M3.2 19.5c.7-3.2 3.1-5 5.8-5s5.1 1.8 5.8 5" />
      <path d="M15.6 5.6a3.1 3.1 0 0 1 0 6" />
      <path d="M15.4 14.6c2.3.3 4.2 2 4.8 4.9" />
    </Svg>
  );
}

export function IconBarChart(props) {
  return (
    <Svg {...props}>
      <path d="M4 20.5V13M4 20.5h16M9.3 20.5V8.4M14.6 20.5V11M19.9 20.5V4.6" />
    </Svg>
  );
}

export function IconChevronLeft(props) {
  return (
    <Svg {...props}>
      <path d="M14.5 5.5l-6.5 6.5 6.5 6.5" />
    </Svg>
  );
}

export function IconLogOut(props) {
  return (
    <Svg {...props}>
      <path d="M9 20.5H5.7c-1.2 0-2.2-1-2.2-2.2V5.7c0-1.2 1-2.2 2.2-2.2H9" />
      <path d="M16 16.3l4.3-4.3-4.3-4.3" />
      <path d="M20.3 12H9.4" />
    </Svg>
  );
}

export function IconX(props) {
  return (
    <Svg {...props}>
      <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />
    </Svg>
  );
}

export function IconTarget(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="4.4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </Svg>
  );
}

export function IconBriefcase(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="7.5" width="18" height="12" rx="1.8" />
      <path d="M8 7.5V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1.5" />
      <path d="M3 12.5h18" />
    </Svg>
  );
}

export function IconReceipt(props) {
  return (
    <Svg {...props}>
      <path d="M5.5 3.5h13v17l-2.4-1.6-2.2 1.6-2.2-1.6-2.2 1.6-2.2-1.6-1.8 1.6z" />
      <path d="M8.3 8.3h7.4M8.3 12h7.4M8.3 15.7h4.6" />
    </Svg>
  );
}

export function IconWallet(props) {
  return (
    <Svg {...props}>
      <path d="M3.5 7.2c0-1 .86-1.8 1.9-1.8h11.2c1.05 0 1.9.8 1.9 1.8v9.6c0 1-.85 1.8-1.9 1.8H5.4c-1.05 0-1.9-.8-1.9-1.8z" />
      <path d="M15.5 12.2h2.4a1 1 0 0 1 1 1v1.6a1 1 0 0 1-1 1h-2.4a1.8 1.8 0 0 1 0-3.6z" />
    </Svg>
  );
}

export function IconClipboardCheck(props) {
  return (
    <Svg {...props}>
      <rect x="5" y="4.2" width="14" height="17.1" rx="1.8" />
      <path d="M9 4.2V3.6a1.6 1.6 0 0 1 1.6-1.6h2.8A1.6 1.6 0 0 1 15 3.6v.6" />
      <path d="M8.7 13l2 2 4.2-4.6" />
    </Svg>
  );
}

export function IconBanknote(props) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="6.5" width="19" height="11" rx="1.8" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M5.5 9v0M18.5 15v0" />
    </Svg>
  );
}

export function IconTrophy(props) {
  return (
    <Svg {...props}>
      <path d="M7 4h10v5.5a5 5 0 0 1-10 0z" />
      <path d="M7 5.5H4.2a1 1 0 0 0-1 1.1c.2 2 1.5 3.6 3.8 4" />
      <path d="M17 5.5h2.8a1 1 0 0 1 1 1.1c-.2 2-1.5 3.6-3.8 4" />
      <path d="M12 14.5v3.2" />
      <path d="M8.7 21h6.6" />
      <path d="M9.7 17.7h4.6l.6 3.3H9.1z" />
    </Svg>
  );
}
