import { HomeIcon, KanbanSquareIcon, ListTodoIcon, UsersIcon, type LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
}

// Grows as each build phase lands its screens (Sell, Tickets, … per §6 of
// the build spec). Keeping it data-driven means the sidebar and the mobile
// bottom tab bar never show a link to a screen that isn't real.
export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/', icon: HomeIcon },
  { label: 'Customers', path: '/customers', icon: UsersIcon },
  { label: 'Pipeline', path: '/pipeline', icon: KanbanSquareIcon },
  { label: 'My Day', path: '/my-day', icon: ListTodoIcon },
]
