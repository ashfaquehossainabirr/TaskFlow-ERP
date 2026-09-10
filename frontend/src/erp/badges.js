// Shared status label/color maps for the ERP modules (CRM, Finance, HR).
export const LEAD_STATUS_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal Sent',
  won: 'Won',
  lost: 'Lost',
};
export const LEAD_STATUS_COLORS = {
  new: 'var(--text-secondary)',
  contacted: 'var(--status-hold)',
  qualified: 'var(--accent-cyan)',
  proposal: 'var(--status-progress)',
  won: 'var(--status-delivered)',
  lost: 'var(--status-cancelled)',
};
export const LEAD_SOURCE_LABELS = {
  website: 'Website',
  referral: 'Referral',
  upwork: 'Upwork',
  fiverr: 'Fiverr',
  linkedin: 'LinkedIn',
  'cold-outreach': 'Cold Outreach',
  other: 'Other',
};

export const CLIENT_STATUS_COLORS = {
  active: 'var(--status-delivered)',
  inactive: 'var(--text-muted)',
};

export const INVOICE_STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};
export const INVOICE_STATUS_COLORS = {
  draft: 'var(--text-secondary)',
  sent: 'var(--status-progress)',
  paid: 'var(--status-delivered)',
  overdue: 'var(--status-cancelled)',
  cancelled: 'var(--text-muted)',
};

export const EXPENSE_CATEGORY_LABELS = {
  'software-subscriptions': 'Software & Subscriptions',
  salaries: 'Salaries',
  'office-rent': 'Office Rent',
  utilities: 'Utilities',
  marketing: 'Marketing',
  'contractor-payments': 'Contractor Payments',
  equipment: 'Equipment',
  travel: 'Travel',
  other: 'Other',
};

export const PAYMENT_METHOD_LABELS = {
  'bank-transfer': 'Bank Transfer',
  card: 'Card',
  cash: 'Cash',
  paypal: 'PayPal',
  other: 'Other',
};

export const ATTENDANCE_STATUS_LABELS = {
  present: 'Present',
  absent: 'Absent',
  'half-day': 'Half Day',
  leave: 'Leave',
  holiday: 'Holiday',
  late: 'Late',
};
export const ATTENDANCE_STATUS_COLORS = {
  present: 'var(--status-delivered)',
  absent: 'var(--status-cancelled)',
  'half-day': 'var(--status-hold)',
  leave: 'var(--accent-cyan)',
  holiday: 'var(--text-muted)',
  late: 'var(--status-progress)',
};

export const PAYROLL_STATUS_COLORS = {
  pending: 'var(--status-hold)',
  paid: 'var(--status-delivered)',
};

export function pillStyle(color) {
  return {
    display: 'inline-block',
    fontSize: 11.5,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color,
  };
}
