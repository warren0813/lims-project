"use client"

import { ReactNode, Fragment } from "react"
import Icons, * as I from "./icons"

// ── Navigation Items ────────────────────────────────────────────
export interface NavItem {
  id: string
  label: string
  cn: string
  icon: keyof typeof Icons
}

export interface NavSection {
  label: string
  items: NavItem[]
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',  label: 'Dashboard',  cn: '儀表板',  icon: 'Home' },
  { id: 'samples',    label: 'Samples',    cn: '樣品',    icon: 'Flask' },
  { id: 'wip',        label: 'WIP',        cn: '在製',    icon: 'WIP' },
  { id: 'dispatches', label: 'Dispatches', cn: '派工',    icon: 'Dispatch' },
  { id: 'equipment',  label: 'Equipment',  cn: '設備',    icon: 'Equipment' },
]

export const FAB_NAV_ITEMS: NavItem[] = [
  { id: 'fab_dashboard', label: 'Dashboard',   cn: '儀表板',   icon: 'Home' },
  { id: 'fab_requests',  label: 'My Requests', cn: '我的申請', icon: 'ClipboardList' },
  { id: 'fab_drafts',    label: 'Drafts',      cn: '草稿',     icon: 'FilePlus' },
  { id: 'fab_new',       label: 'New Request', cn: '新申請',   icon: 'Plus' },
]

export const MGR_NAV_ITEMS: NavItem[] = [
  { id: 'mgr_dashboard',    label: 'Dashboard',     cn: '儀表板',   icon: 'Home' },
  { id: 'mgr_all_requests', label: 'All Requests',  cn: '所有申請', icon: 'ClipboardList' },
  { id: 'mgr_recipes',      label: 'Recipes',       cn: '配方',     icon: 'Flask' },
  { id: 'mgr_equipment',    label: 'Equipment',     cn: '設備',     icon: 'Equipment' },
  { id: 'mgr_reports',      label: 'Reports',       cn: '報告',     icon: 'TrendUp' },
]

// ── Route type ────────────────────────────────────────────────
export interface Route {
  page: string
  id?: string | number
  tab?: string
}

// ── User type ────────────────────────────────────────────────
export interface User {
  username: string
  role: string
  display: string
  subtitle: string
}

// ── Sidebar ────────────────────────────────────────────────────
interface SidebarProps {
  route: Route
  navigate: (route: Route) => void
  counts?: Record<string, number>
  user?: User
  onLogout?: () => void
  navItems?: NavItem[]
  navSections?: NavSection[]
  sectionLabel?: string
}

export const Sidebar = ({ 
  route, 
  navigate, 
  counts = {}, 
  user, 
  onLogout, 
  navItems = NAV_ITEMS, 
  navSections, 
  sectionLabel = 'Lab Operations' 
}: SidebarProps) => {
  const sections = navSections || [{ label: sectionLabel, items: navItems }]
  
  return (
    <aside style={{
      width: 'var(--sidebar-width)', height: '100vh', position: 'fixed', left: 0, top: 0,
      background: 'var(--bg-sidebar)', color: '#cbd5e1',
      display: 'flex', flexDirection: 'column',
      borderRight: '1px solid rgba(255,255,255,0.04)',
      zIndex: 20, overflow: 'hidden',
    }}>
      {/* Ambient orb effects */}
      <div style={{
        position: 'absolute', top: -40, right: -50, width: 180, height: 180, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(244,168,191,0.18) 0%, transparent 65%)',
        pointerEvents: 'none', filter: 'blur(8px)',
      }}/>
      <div style={{
        position: 'absolute', bottom: 80, left: -60, width: 200, height: 200, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(187,183,232,0.15) 0%, transparent 65%)',
        pointerEvents: 'none', filter: 'blur(8px)',
      }}/>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '14px 14px', pointerEvents: 'none',
      }}/>
      {/* Twinkles */}
      <div style={{ position: 'absolute', top: 60, right: 28, width: 4, height: 4, background: '#f4a8bf', borderRadius: '50%', animation: 'lims-twinkle 3.2s infinite' }}/>
      <div style={{ position: 'absolute', top: 180, left: 22, width: 3, height: 3, background: '#bbb7e8', borderRadius: '50%', animation: 'lims-twinkle 4.1s infinite 0.8s' }}/>
      <div style={{ position: 'absolute', bottom: 220, right: 40, width: 3, height: 3, background: '#9ebbc8', borderRadius: '50%', animation: 'lims-twinkle 3.6s infinite 1.6s' }}/>

      {/* Logo */}
      <div style={{ padding: '20px 20px 24px', display: 'flex', alignItems: 'center', gap: 11, position: 'relative' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #f4a8bf 0%, #bbb7e8 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(244,168,191,0.35)',
        }}>
          <I.Flask size={19} color="#fff" />
        </div>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em' }}>LIMS</div>
      </div>

      {/* Sectioned nav */}
      {sections.map((sec, si) => (
        <Fragment key={si}>
          <div style={{
            padding: si === 0 ? '14px 18px 8px' : '20px 18px 8px',
            fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em',
            color: '#5a5a6e', textTransform: 'uppercase', position: 'relative',
          }}>{sec.label}</div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px', position: 'relative' }}>
            {sec.items.map(item => {
              const active = route.page === item.id
              const IconComponent = Icons[item.icon]
              const count = counts[item.id]
              return (
                <button 
                  key={item.id} 
                  onClick={() => navigate({ page: item.id })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 11,
                    padding: '9px 10px',
                    background: active ? 'var(--bg-sidebar-active)' : 'transparent',
                    color: active ? '#fff' : 'var(--text-sidebar)',
                    borderRadius: 8, fontSize: 13.5, fontWeight: active ? 600 : 500,
                    textAlign: 'left', position: 'relative',
                    transition: 'background 0.12s, color 0.12s',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-sidebar-hover)' }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <IconComponent size={16}/>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {count != null && count > 0 && (
                    <span style={{
                      minWidth: 20, padding: '0 6px', height: 18, borderRadius: 999,
                      background: active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)',
                      color: active ? '#fff' : '#bbbbcc',
                      fontSize: 11, fontWeight: 600, display: 'inline-flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>{count}</span>
                  )}
                </button>
              )
            })}
          </nav>
        </Fragment>
      ))}

      <div style={{ flex: 1 }}/>

      {/* User card */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.06)', padding: '14px 14px',
        display: 'flex', alignItems: 'center', gap: 11, position: 'relative',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg, #f4a8bf 0%, #bbb7e8 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 14,
        }}>{user?.display?.[0]?.toUpperCase() || 'L'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontSize: 13.5, fontWeight: 600, lineHeight: 1.3 }}>{user?.display || 'lab_member'}</div>
          <div style={{ fontSize: 11, color: '#888899', marginTop: 2 }}>{user?.subtitle || '實驗室成員'}</div>
        </div>
        {onLogout && (
          <button 
            onClick={onLogout} 
            title="Sign out" 
            style={{
              width: 28, height: 28, borderRadius: 6, color: '#888899',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.12s, color 0.12s',
              border: 'none', background: 'transparent', cursor: 'pointer',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#888899' }}
          >
            <I.LogOut size={14}/>
          </button>
        )}
      </div>
    </aside>
  )
}

// ── TopBar ────────────────────────────────────────────────────
interface TopBarProps {
  title: string
  subtitle?: string
  breadcrumb?: ReactNode
  right?: ReactNode
}

export const TopBar = ({ title, subtitle, breadcrumb, right }: TopBarProps) => (
  <header style={{
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '24px 32px 0', gap: 24,
  }}>
    <div style={{ minWidth: 0, flex: 1 }}>
      {breadcrumb && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--text-secondary)', fontSize: 13 }}>
          {breadcrumb}
        </div>
      )}
      <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)', lineHeight: 1.2, margin: 0 }}>{title}</h1>
      {subtitle && <div style={{ marginTop: 4, fontSize: 13.5, color: 'var(--text-secondary)' }}>{subtitle}</div>}
    </div>
    {right && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{right}</div>}
  </header>
)

// ── Page wrapper ────────────────────────────────────────────────
interface PageProps {
  title?: string
  subtitle?: string
  breadcrumb?: ReactNode
  right?: ReactNode
  children: ReactNode
}

export const Page = ({ title, subtitle, breadcrumb, right, children }: PageProps) => (
  <div style={{ padding: '32px 44px 80px', maxWidth: 1320, margin: '0 auto' }}>
    {breadcrumb}
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 24 }}>
      <div style={{ minWidth: 0 }}>
        {title && <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>{title}</h1>}
        {subtitle && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>{subtitle}</div>}
      </div>
      {right && <div style={{ display: 'inline-flex', gap: 10, flexShrink: 0 }}>{right}</div>}
    </div>
    {children}
  </div>
)

export const SHELL = {
  Sidebar,
  TopBar,
  Page,
  NAV_ITEMS,
  FAB_NAV_ITEMS,
  MGR_NAV_ITEMS,
}

export default SHELL
