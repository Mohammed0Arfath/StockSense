import {
  LayoutDashboard,
  Package,
  Boxes,
  Truck,
  ArrowRightLeft,
  ClipboardMinus,
  History,
  Warehouse,
  MapPin,
  RotateCcw,
  Settings,
  User,
} from 'lucide-react'

export const navSections = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Inventory',
    items: [
      { label: 'Products', path: '/products', icon: Package },
      { label: 'Stock', path: '/stock', icon: Boxes },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Receipts', path: '/receipts', icon: Truck },
      { label: 'Deliveries', path: '/deliveries', icon: Truck },
      { label: 'Internal Transfers', path: '/transfers', icon: ArrowRightLeft },
      { label: 'Adjustments', path: '/adjustments', icon: ClipboardMinus },
      { label: 'Move History', path: '/move-history', icon: History },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { label: 'Warehouses', path: '/warehouses', icon: Warehouse },
      { label: 'Locations', path: '/locations', icon: MapPin },
      { label: 'Reordering Rules', path: '/reordering-rules', icon: RotateCcw },
    ],
  },
]

export const bottomNav = [
  { label: 'Settings', path: '/settings', icon: Settings },
  { label: 'My Profile', path: '/profile', icon: User },
]
