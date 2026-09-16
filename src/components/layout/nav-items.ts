import {
  BarChart3Icon,
  BriefcaseIcon,
  CupSodaIcon,
  HeadsetIcon,
  HomeIcon,
  KanbanSquareIcon,
  ListTodoIcon,
  MegaphoneIcon,
  ReceiptTextIcon,
  ShieldIcon,
  TicketPercentIcon,
  UsersIcon,
  WifiIcon,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  /** Shown directly in the mobile bottom tab bar (max ~4); everything else lives behind "More". */
  primary?: boolean
  /** Hidden from nav entirely unless can(profile, 'manage_users') — the page itself still gates on this too. */
  adminOnly?: boolean
  /** When set, AppShell renders this business unit's configurable name (Admin > Settings) instead of `label`. */
  unit?: 'wifi' | 'services' | 'refreshment'
}

// Grows as each build phase lands its screens (Tickets, Billing, … per §6 of
// the build spec). Keeping it data-driven means the sidebar, the mobile
// bottom tab bar and the "More" sheet never show a link to a screen that
// isn't real.
export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/', icon: HomeIcon, primary: true },
  { label: 'Customers', path: '/customers', icon: UsersIcon, primary: true },
  { label: 'Sell', path: '/sell', icon: TicketPercentIcon, primary: true },
  { label: 'My Day', path: '/my-day', icon: ListTodoIcon, primary: true },
  { label: 'Pipeline', path: '/pipeline', icon: KanbanSquareIcon },
  { label: 'WiFi', path: '/wifi', icon: WifiIcon, unit: 'wifi' },
  { label: 'Tickets', path: '/tickets', icon: HeadsetIcon },
  { label: 'Billing', path: '/billing', icon: ReceiptTextIcon },
  { label: 'Services', path: '/services', icon: BriefcaseIcon, unit: 'services' },
  { label: 'Refreshment', path: '/refreshment', icon: CupSodaIcon, unit: 'refreshment' },
  { label: 'Campaigns', path: '/campaigns', icon: MegaphoneIcon },
  { label: 'Reports', path: '/reports', icon: BarChart3Icon },
  { label: 'Admin', path: '/admin', icon: ShieldIcon, adminOnly: true },
]
