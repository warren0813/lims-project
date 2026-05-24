"use client"

import { useState, CSSProperties, ReactNode } from "react"
import * as I from "./icons"

// ── Card ────────────────────────────────────────────────────────
interface CardProps {
  children: ReactNode
  style?: CSSProperties
  padding?: number | string
  className?: string
}

export const Card = ({ children, style, padding = 0, className, ...rest }: CardProps) => (
  <div 
    className={className}
    style={{
      background: '#fff',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding,
      ...style,
    }} 
    {...rest}
  >
    {children}
  </div>
)

// ── SectionLabel ────────────────────────────────────────────────
interface SectionLabelProps {
  children: ReactNode
  style?: CSSProperties
  right?: ReactNode
}

export const SectionLabel = ({ children, style, right }: SectionLabelProps) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    ...style,
  }}>
    <span>{children}</span>
    {right}
  </div>
)

// ── Badge/Status Mapping ────────────────────────────────────────
const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  // sample
  created:   { bg: 'var(--status-created-bg)',   color: 'var(--status-created-text)',   label: 'Created' },
  shipped:   { bg: 'var(--status-shipped-bg)',   color: 'var(--status-shipped-text)',   label: 'Shipped' },
  received:  { bg: 'var(--status-received-bg)',  color: 'var(--status-received-text)',  label: 'Received' },
  processing:{ bg: 'var(--status-progress-bg)',  color: 'var(--status-progress-text)',  label: 'Processing' },
  completed: { bg: 'var(--status-completed-bg)', color: 'var(--status-completed-text)', label: 'Completed' },
  lost:      { bg: 'var(--status-aborted-bg)',   color: 'var(--status-aborted-text)',   label: 'Lost' },
  // wip
  in_progress:{ bg: 'var(--status-progress-bg)', color: 'var(--status-progress-text)',  label: 'In Progress' },
  aborted:   { bg: 'var(--status-aborted-bg)',   color: 'var(--status-aborted-text)',   label: 'Aborted' },
  // dispatch
  pending:   { bg: 'var(--status-pending-bg)',   color: 'var(--status-pending-text)',   label: 'Pending' },
  running:   { bg: 'var(--status-progress-bg)',  color: 'var(--status-progress-text)',  label: 'Running' },
  failed:    { bg: 'var(--status-aborted-bg)',   color: 'var(--status-aborted-text)',   label: 'Failed' },
  // result
  PASS:      { bg: 'var(--status-pass-bg)',      color: 'var(--status-pass-text)',      label: 'PASS' },
  FAIL:      { bg: 'var(--status-fail-bg)',      color: 'var(--status-fail-text)',      label: 'FAIL' },
  // request statuses
  draft:       { bg: '#ebebf0', color: '#5a5a6e', label: 'Draft' },
  submitted:   { bg: '#fef0d4', color: '#b8720e', label: 'Submitted' },
  waiting_sample_receive: { bg: '#fef4dd', color: '#a06618', label: 'Waiting Sample' },
  final_check: { bg: '#ecebf3', color: '#4f4a8f', label: 'Final Check' },
  returned:    { bg: '#f9d7e0', color: '#a73d56', label: 'Returned' },
  rejected:    { bg: '#fde4e4', color: '#c0394a', label: 'Rejected' },
  cancelled:   { bg: '#ebebf0', color: '#777788', label: 'Cancelled' },
  // sample statuses
  incoming:    { bg: '#fef4dd', color: '#a06618', label: 'Incoming' },
  in_wip:      { bg: '#ecebf3', color: '#4f4a8f', label: 'In WIP' },
  // urgency
  '3d':        { bg: '#fbe4e6', color: '#a93445', label: '3 Days' },
  '1w':        { bg: '#ecebf3', color: '#4f4a8f', label: '1 Week' },
  '2w':        { bg: '#eef0ed', color: '#4d5a4f', label: '2 Weeks' },
  // equipment
  idle:        { bg: '#e7f0e9', color: '#2e6a47', label: 'Idle' },
  working:     { bg: '#ecebf3', color: '#4f4a8f', label: 'Working' },
  faulty:      { bg: '#fbe4e6', color: '#a93445', label: 'Faulty' },
  maintenance: { bg: '#fbe4e6', color: '#a93445', label: 'Maintenance' },
  // dispatch additional
  ready_for_dispatch: { bg: '#fef0d4', color: '#b8720e', label: 'Queued' },
  dispatched:      { bg: '#ecedf0', color: '#5a5a6e', label: 'Dispatched' },
  unloaded:        { bg: '#e3eef3', color: '#356a82', label: 'Unloaded' },
  exception:       { bg: '#fde9d8', color: '#9a4715', label: 'Exception' },
  result_recorded: { bg: '#e7f0e9', color: '#2e6a47', label: 'Result Recorded' },
  // verdict
  pass:        { bg: '#e7f0e9', color: '#2e6a47', label: 'Pass' },
  fail:        { bg: '#fbe4e6', color: '#a93445', label: 'Fail' },
}

// ── Badge ─────────────────────────────────────────────────────
interface BadgeProps {
  status: string
  label?: string
  dot?: boolean
  mono?: boolean
  style?: CSSProperties
}

export const Badge = ({ status, label, dot, mono, style }: BadgeProps) => {
  const s = STATUS_MAP[status] || { bg: 'var(--status-created-bg)', color: 'var(--status-created-text)', label: label || status }
  const isLive = status === 'running' || status === 'in_progress'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 999,
      fontSize: 12, fontWeight: 500,
      background: s.bg, color: s.color,
      whiteSpace: 'nowrap',
      fontFamily: mono ? 'var(--font-mono)' : 'inherit',
      letterSpacing: mono ? '0.02em' : 'normal',
      ...style,
    }}>
      {(dot || isLive) && (
        <span style={{
          width: 6, height: 6, borderRadius: 999, background: s.color,
          ...(isLive ? { animation: 'pulse 1.4s infinite' } : {}),
        }}/>
      )}
      {label || s.label}
    </span>
  )
}

// ── Button ────────────────────────────────────────────────────
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  children?: ReactNode
  style?: CSSProperties
  disabled?: boolean
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  type?: 'button' | 'submit' | 'reset'
}

export const Button = ({ 
  variant = 'primary', 
  size = 'md', 
  icon, 
  children, 
  style, 
  disabled,
  onClick,
  type = 'button',
  ...rest 
}: ButtonProps) => {
  const sizes = {
    sm: { h: 28, px: 10, fs: 12, gap: 6, iconSize: 13 },
    md: { h: 34, px: 14, fs: 13, gap: 7, iconSize: 14 },
    lg: { h: 40, px: 18, fs: 14, gap: 8, iconSize: 15 },
  }[size]
  
  const variants = {
    primary: { bg: 'var(--primary)', color: '#fff', border: 'var(--primary)', hoverBg: 'var(--primary-hover)' },
    secondary: { bg: '#fff', color: 'var(--text-primary)', border: 'var(--border-strong)', hoverBg: '#f8fafc' },
    ghost: { bg: 'transparent', color: 'var(--text-secondary)', border: 'transparent', hoverBg: '#ebebf0' },
    danger: { bg: '#fff', color: '#a02e3d', border: '#f8c8cf', hoverBg: '#fde9eb' },
    success: { bg: '#1ea05a', color: '#fff', border: '#1ea05a', hoverBg: '#157a4a' },
    dark: { bg: '#1e1e24', color: '#fff', border: '#1e1e24', hoverBg: '#2d2d38' },
  }[variant]
  
  const [hover, setHover] = useState(false)
  
  return (
    <button
      type={type}
      onClick={onClick}
      onMouseEnter={() => setHover(true)} 
      onMouseLeave={() => setHover(false)}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: sizes.gap,
        height: sizes.h, padding: `0 ${sizes.px}px`,
        fontSize: sizes.fs, fontWeight: 500,
        background: hover && !disabled ? variants.hoverBg : variants.bg,
        color: variants.color,
        border: `1px solid ${variants.border}`,
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.12s, border 0.12s',
        whiteSpace: 'nowrap',
        fontFamily: 'inherit',
        ...style,
      }} 
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

// ── IDChip ────────────────────────────────────────────────────
interface IDChipProps {
  id: string | number
  prefix?: string
  size?: 'sm' | 'md'
  muted?: boolean
  style?: CSSProperties
}

export const IDChip = ({ id, prefix = '#', size = 'md', muted = false, style }: IDChipProps) => {
  const fs = size === 'sm' ? 11 : 12
  const ph = size === 'sm' ? '2px 6px' : '3px 8px'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: ph, borderRadius: 6,
      background: muted ? 'transparent' : '#ebebf0',
      color: muted ? 'var(--text-muted)' : 'var(--text-secondary)',
      fontFamily: 'var(--font-mono)',
      fontSize: fs, fontWeight: 500,
      letterSpacing: '0.01em',
      ...style,
    }}>{prefix}{id}</span>
  )
}

// ── FlowDots ────────────────────────────────────────────────
interface FlowDotsProps {
  steps: string[]
  current: string
  size?: number
  gap?: number
  doneColor?: string
  currentColor?: string
  style?: CSSProperties
}

export const FlowDots = ({ 
  steps, 
  current, 
  size = 6, 
  gap = 4, 
  doneColor = 'var(--primary)', 
  currentColor = 'var(--primary)', 
  style 
}: FlowDotsProps) => {
  const idx = steps.indexOf(current)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap, ...style }}>
      {steps.map((s, i) => (
        <span key={s} style={{
          width: i === idx ? size + 2 : size,
          height: i === idx ? size + 2 : size,
          borderRadius: 999,
          background: i < idx ? doneColor : i === idx ? currentColor : 'rgba(0,0,0,0.09)',
          ...(i === idx ? { boxShadow: '0 0 0 2px rgba(108,103,184,0.20)' } : {}),
        }}/>
      ))}
    </span>
  )
}

// ── PriorityMarker ────────────────────────────────────────────
interface PriorityMarkerProps {
  priority: 'high' | 'urgent' | 'normal'
}

export const PriorityMarker = ({ priority }: PriorityMarkerProps) => {
  const colorMap = { high: '#f59e0b', urgent: '#ef4444', normal: 'transparent' }
  const c = colorMap[priority] || 'transparent'
  return (
    <span style={{
      display: 'inline-block',
      width: 3, height: 28, borderRadius: 2,
      background: c,
    }}/>
  )
}

// ── Avatar ────────────────────────────────────────────────────
interface AvatarProps {
  name: string
  size?: number
  bg?: string
}

export const Avatar = ({ name, size = 32, bg = '#6c67b8' }: AvatarProps) => {
  const initial = (name || '?')[0].toUpperCase()
  return (
    <span style={{
      width: size, height: size, borderRadius: 999,
      background: bg, color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 600, letterSpacing: '0.02em',
      flexShrink: 0,
    }}>{initial}</span>
  )
}

// ── EmptyState ────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: ReactNode
  title: string
  message?: string
  action?: ReactNode
}

export const EmptyState = ({ icon, title, message, action }: EmptyStateProps) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '48px 24px', gap: 10, color: 'var(--text-muted)', textAlign: 'center',
  }}>
    {icon && <div style={{ color: 'var(--text-muted)' }}>{icon}</div>}
    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>{title}</div>
    {message && <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 320 }}>{message}</div>}
    {action}
  </div>
)

// ── formatDuration ────────────────────────────────────────────
export function formatDuration(totalSec: number | null | undefined): string {
  if (totalSec == null) return '—'
  if (totalSec === 0) return '0s'
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = Math.floor(totalSec % 60)
  const parts: string[] = []
  if (d) parts.push(`${d}d`)
  if (h) parts.push(`${h}h`)
  if (m) parts.push(`${m}m`)
  if (s && d === 0) parts.push(`${s}s`)
  return parts.join(' ') || '0s'
}

// ── Pill (generic) ────────────────────────────────────────────
interface PillProps {
  label: string
  bg: string
  fg: string
  size?: 'sm' | 'md'
  dot?: boolean
}

export const Pill = ({ label, bg, fg, size = 'md', dot }: PillProps) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: dot ? 6 : 0, justifyContent: 'center',
    padding: size === 'sm' ? '3px 9px' : '4px 11px',
    borderRadius: 999, background: bg, color: fg,
    fontSize: size === 'sm' ? 11 : 12, fontWeight: 600, letterSpacing: '0.01em',
    whiteSpace: 'nowrap',
  }}>
    {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: fg }}/>}
    {label}
  </span>
)

// ── StatusPill ────────────────────────────────────────────────
interface StatusPillProps {
  status: string
  size?: 'sm' | 'md'
}

export const StatusPill = ({ status, size = 'md' }: StatusPillProps) => {
  const m = STATUS_MAP[status] || { label: status, bg: '#ebebf0', color: '#5a5a6e' }
  return <Pill label={m.label} bg={m.bg} fg={m.color} size={size} />
}

// ── UrgencyPill ────────────────────────────────────────────────
interface UrgencyPillProps {
  urgency: string
  size?: 'sm' | 'md'
}

export const UrgencyPill = ({ urgency, size = 'sm' }: UrgencyPillProps) => {
  const m = STATUS_MAP[urgency] || STATUS_MAP['1w']
  return <Pill label={m.label} bg={m.bg} fg={m.color} size={size} />
}

// ── Modal ────────────────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: number
  footer?: ReactNode
}

export const Modal = ({ open, onClose, title, children, width = 540, footer }: ModalProps) => {
  if (!open) return null
  return (
    <div 
      onClick={onClose} 
      style={{
        position: 'fixed', inset: 0, background: 'rgba(20,20,28,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, padding: 20, animation: 'fade-in 0.12s ease-out',
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        style={{
          background: '#fff', borderRadius: 14, width: '100%', maxWidth: width,
          boxShadow: '0 30px 60px -20px rgba(20,20,28,0.4)',
          maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
          <button 
            onClick={onClose} 
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer', padding: 4,
              color: 'var(--text-muted)', display: 'inline-flex',
            }}
          >
            <I.X size={18}/>
          </button>
        </div>
        <div style={{ padding: 24, overflow: 'auto' }}>{children}</div>
        {footer && (
          <div style={{
            padding: '14px 24px', borderTop: '1px solid rgba(0,0,0,0.05)',
            display: 'flex', justifyContent: 'flex-end', gap: 10,
          }}>{footer}</div>
        )}
      </div>
    </div>
  )
}

// ── Breadcrumb ────────────────────────────────────────────────
interface BreadcrumbItem {
  label: string
  onClick?: () => void
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export const Breadcrumb = ({ items }: BreadcrumbProps) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 14, fontSize: 13 }}>
    {items.map((it, i) => (
      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {i > 0 && <I.ChevronRight size={13} color="var(--text-muted)"/>}
        {it.onClick ? (
          <button 
            onClick={it.onClick} 
            style={{
              background: 'transparent', border: 'none', padding: '2px 4px', cursor: 'pointer',
              color: 'var(--accent-link)', fontWeight: 600, fontFamily: 'inherit', fontSize: 13,
            }}
          >
            {it.label}
          </button>
        ) : (
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500, padding: '2px 4px' }}>{it.label}</span>
        )}
      </span>
    ))}
  </div>
)

// ── Form inputs ────────────────────────────────────────────────
const inputStyle: CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: '#fff',
  fontSize: 13.5, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none',
}

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  style?: CSSProperties
}

export const TextInput = (props: TextInputProps) => (
  <input {...props} style={{ ...inputStyle, ...props.style }}/>
)

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  style?: CSSProperties
  children: ReactNode
}

export const SelectInput = ({ children, style, ...props }: SelectInputProps) => (
  <select {...props} style={{ ...inputStyle, cursor: 'pointer', ...style }}>{children}</select>
)

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  style?: CSSProperties
}

export const TextArea = (props: TextAreaProps) => (
  <textarea {...props} style={{ ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'inherit', ...props.style }}/>
)

interface FieldLabelProps {
  children: ReactNode
  required?: boolean
}

export const FieldLabel = ({ children, required }: FieldLabelProps) => (
  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
    {children}{required && <span style={{ color: '#c0394a' }}>*</span>}
  </div>
)

// ── CardHeader ────────────────────────────────────────────────
interface CardHeaderProps {
  children: ReactNode
  style?: CSSProperties
}

export const CardHeader = ({ children, style }: CardHeaderProps) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.05)',
    fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
    textTransform: 'uppercase', letterSpacing: '0.08em', ...style,
  }}>{children}</div>
)

// Export all as UI namespace
export const UI = {
  Card,
  SectionLabel,
  Badge,
  Button,
  IDChip,
  FlowDots,
  PriorityMarker,
  Avatar,
  EmptyState,
  formatDuration,
  Pill,
  StatusPill,
  UrgencyPill,
  Modal,
  Breadcrumb,
  TextInput,
  SelectInput,
  TextArea,
  FieldLabel,
  CardHeader,
}

export default UI
