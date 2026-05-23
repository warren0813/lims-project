"use client"

import { CSSProperties } from "react"

interface IconProps {
  size?: number
  color?: string
  strokeWidth?: number
  style?: CSSProperties
  className?: string
}

const Icon = ({ 
  children, 
  size = 16, 
  color = "currentColor", 
  strokeWidth = 2, 
  style, 
  className,
  ...rest 
}: IconProps & { children: React.ReactNode }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color}
    strokeWidth={strokeWidth} 
    strokeLinecap="round" 
    strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }} 
    className={className}
    {...rest}
  >
    {children}
  </svg>
)

export const Home = (p: IconProps) => <Icon {...p}><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z"/></Icon>
export const Flask = (p: IconProps) => <Icon {...p}><path d="M9 3h6"/><path d="M10 3v6L4.5 18a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9V3"/><path d="M7 14h10"/></Icon>
export const WIP = (p: IconProps) => <Icon {...p}><path d="M3 3v18h18"/><path d="M7 16l4-6 4 3 5-7"/></Icon>
export const Dispatch = (p: IconProps) => <Icon {...p}><path d="M17 3l4 4-4 4"/><path d="M3 7h18"/><path d="M7 21l-4-4 4-4"/><path d="M21 17H3"/></Icon>
export const Equipment = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Icon>
export const Plus = (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>
export const Search = (p: IconProps) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Icon>
export const ChevronDown = (p: IconProps) => <Icon {...p}><path d="M6 9l6 6 6-6"/></Icon>
export const ChevronRight = (p: IconProps) => <Icon {...p}><path d="M9 6l6 6-6 6"/></Icon>
export const ChevronLeft = (p: IconProps) => <Icon {...p}><path d="M15 18l-6-6 6-6"/></Icon>
export const Bell = (p: IconProps) => <Icon {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></Icon>
export const Alert = (p: IconProps) => <Icon {...p}><path d="M10.3 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></Icon>
export const Check = (p: IconProps) => <Icon {...p}><path d="M20 6L9 17l-5-5"/></Icon>
export const X = (p: IconProps) => <Icon {...p}><path d="M18 6L6 18M6 6l12 12"/></Icon>
export const Clock = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></Icon>
export const Play = (p: IconProps) => <Icon {...p}><path d="M5 3l14 9-14 9V3z"/></Icon>
export const Pause = (p: IconProps) => <Icon {...p}><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></Icon>
export const Inbox = (p: IconProps) => <Icon {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></Icon>
export const Package = (p: IconProps) => <Icon {...p}><path d="M16.5 9.4l-9-5.19"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/></Icon>
export const Activity = (p: IconProps) => <Icon {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></Icon>
export const Zap = (p: IconProps) => <Icon {...p}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></Icon>
export const ArrowRight = (p: IconProps) => <Icon {...p}><path d="M5 12h14M12 5l7 7-7 7"/></Icon>
export const ArrowLeft = (p: IconProps) => <Icon {...p}><path d="M19 12H5M12 19l-7-7 7-7"/></Icon>
export const ArrowUpRight = (p: IconProps) => <Icon {...p}><path d="M7 17L17 7M7 7h10v10"/></Icon>
export const MoreH = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></Icon>
export const Filter = (p: IconProps) => <Icon {...p}><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></Icon>
export const Calendar = (p: IconProps) => <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></Icon>
export const User = (p: IconProps) => <Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></Icon>
export const CircleCheck = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></Icon>
export const CircleAlert = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></Icon>
export const Layers = (p: IconProps) => <Icon {...p}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></Icon>
export const TrendUp = (p: IconProps) => <Icon {...p}><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></Icon>
export const Refresh = (p: IconProps) => <Icon {...p}><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></Icon>
export const Eye = (p: IconProps) => <Icon {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></Icon>
export const EyeOff = (p: IconProps) => <Icon {...p}><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.77 19.77 0 0 1 5.06-5.94"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.85 19.85 0 0 1-2.16 3.19"/><path d="M14.12 14.12A3 3 0 1 1 9.88 9.88"/><path d="M1 1l22 22"/></Icon>
export const ClipboardList = (p: IconProps) => <Icon {...p}><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h6M9 8h.01"/></Icon>
export const FilePlus = (p: IconProps) => <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6M9 15h6"/></Icon>
export const ArrowDown = (p: IconProps) => <Icon {...p}><path d="M12 5v14M19 12l-7 7-7-7"/></Icon>
export const LogOut = (p: IconProps) => <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></Icon>
export const Trash = (p: IconProps) => <Icon {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></Icon>
export const Wafer = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18"/><path d="M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/></Icon>

// Aggregated export for convenience
export const I = {
  Home,
  Flask,
  WIP,
  Dispatch,
  Equipment,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Bell,
  Alert,
  Check,
  X,
  Clock,
  Play,
  Pause,
  Inbox,
  Package,
  Activity,
  Zap,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  MoreH,
  Filter,
  Calendar,
  User,
  CircleCheck,
  CircleAlert,
  Layers,
  TrendUp,
  Refresh,
  Eye,
  EyeOff,
  ClipboardList,
  FilePlus,
  ArrowDown,
  LogOut,
  Trash,
  Wafer,
}

export default I
