"use client"

import { Page, Route } from "@/components/lims/shell"
import { Card } from "@/components/lims/primitives"
import * as I from "@/components/lims/icons"
import { useDashboardData } from "@/lib/lims/hooks"

interface LabDashboardProps {
  navigate: (r: Route) => void
}

const TODAY = '2026-05-11'

// Design tokens
const ink = '#1e1e24'
const text2 = '#5a5a6e'
const muted = '#8e8ea0'
const line = 'rgba(0,0,0,0.08)'
const surface = '#fff'

// Pill styles
const PILL: Record<string, { label: string; bg: string; fg: string }> = {
  incoming:  { label: 'Incoming',  bg: '#fef4dd', fg: '#a06618' },
  received:  { label: 'Received',  bg: '#e7f0e9', fg: '#2e6a47' },
  in_wip:    { label: 'In WIP',    bg: '#ecebf3', fg: '#4f4a8f' },
  running:   { label: 'Running',   bg: '#ecebf3', fg: '#4f4a8f' },
  pending:   { label: 'Pending',   bg: '#fef4dd', fg: '#a06618' },
  unloaded:  { label: 'Unloaded',  bg: '#e3eef3', fg: '#356a82' },
  in_progress: { label: 'In Progress', bg: '#ecebf3', fg: '#4f4a8f' },
}

const Pill = ({ kind, dotted }: { kind: string; dotted?: boolean }) => {
  const p = PILL[kind] || { label: kind, bg: '#ecedf0', fg: '#5a5a6e' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 9px', borderRadius: 999,
      background: p.bg, color: p.fg, fontSize: 11.5, fontWeight: 700,
      letterSpacing: '0.02em', whiteSpace: 'nowrap',
    }}>
      {dotted && <span style={{ width: 6, height: 6, borderRadius: 999, background: p.fg, animation: kind === 'running' ? 'pulse 1.4s ease-in-out infinite' : 'none' }}/>}
      {p.label}
    </span>
  )
}

export function LabDashboard({ navigate }: LabDashboardProps) {
  const { samples, wips, dispatches, loading, error } = useDashboardData()
  
  const incoming = samples.filter(s => s.status === 'incoming').length
  const activeWips = wips.filter(w => w.status === 'in_progress').length
  const runningDps = dispatches.filter(d => d.status === 'running').length
  const needsRecord = dispatches.filter(d => d.status === 'unloaded' || d.status === 'exception').length

  const initialLoad = loading && samples.length === 0
  const v = (n: number) => initialLoad ? '—' : n

  const tiles = [
    { label: 'Incoming wafers', value: v(incoming),    onClick: () => navigate({ page: 'samples', tab: 'incoming' }), icon: <I.Inbox size={16} color="#a06618"/>, tint: '#fef4dd' },
    { label: 'Active WIPs',     value: v(activeWips),  onClick: () => navigate({ page: 'wip' }),                       icon: <I.WIP   size={16} color="#4f4a8f"/>, tint: '#ecebf3' },
    { label: 'Dispatches live', value: v(runningDps),  onClick: () => navigate({ page: 'dispatches', tab: 'active' }), icon: <I.Activity size={16} color="#a93445"/>, tint: '#fbe4e6' },
    { label: 'To record',       value: v(needsRecord), onClick: () => navigate({ page: 'dispatches', tab: 'record' }), icon: <I.ClipboardList size={16} color="#2e6a47"/>, tint: '#e7f0e9' },
  ]

  // Active dispatches for "Now Running" card
  const activeDispatches = dispatches.filter(d => d.status === 'running' || d.status === 'pending').slice(0, 5)
  // To record dispatches
  const toRecord = dispatches.filter(d => d.status === 'unloaded' || d.status === 'exception').slice(0, 5)

  return (
    <Page
      title="Dashboard"
      subtitle={`Welcome back, lab_member · ${TODAY}`}
    >
      {error && (
        <div style={{
          padding: '12px 16px', marginBottom: 14, borderRadius: 10,
          background: '#fde4e4', color: '#c0394a', fontSize: 13.5, fontWeight: 500,
          border: '1px solid #f6c4c4',
        }}>
          {"Couldn't load tile counts: "}{error}
        </div>
      )}
      
      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        {tiles.map(t => (
          <button 
            key={t.label} 
            onClick={t.onClick} 
            style={{
              position: 'relative', textAlign: 'left', padding: '16px 18px',
              borderRadius: 14, background: surface,
              border: `1px solid ${line}`, cursor: 'pointer',
              fontFamily: 'inherit', overflow: 'hidden',
              transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => { 
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'rgba(108,103,184,0.35)'
              el.style.transform = 'translateY(-2px)'
              el.style.boxShadow = '0 10px 24px -14px rgba(108,103,184,0.35)'
            }}
            onMouseLeave={(e) => { 
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = line
              el.style.transform = 'translateY(0)'
              el.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{
                width: 30, height: 30, borderRadius: 9,
                background: t.tint, display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
              }}>{t.icon}</span>
              <span style={{ fontSize: 12, color: text2, fontWeight: 600 }}>{t.label}</span>
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 700,
              color: ink, letterSpacing: '-0.02em', lineHeight: 1,
            }}>{t.value}</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 22 }}>
        {/* Now Running */}
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '14px 20px', borderBottom: `1px solid rgba(0,0,0,0.05)`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: '#ecebf3', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <I.Activity size={14} color="#4f4a8f"/>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: ink }}>Now Running</span>
            </div>
            <span style={{
              padding: '2px 8px', borderRadius: 999,
              background: '#ecebf3', color: '#4f4a8f',
              fontSize: 12, fontWeight: 700,
            }}>{activeDispatches.length}</span>
          </div>
          <div style={{ maxHeight: 300, overflow: 'auto' }}>
            {activeDispatches.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: muted, fontSize: 13 }}>
                No dispatches running
              </div>
            ) : activeDispatches.map(d => (
              <button 
                key={d.id}
                onClick={() => navigate({ page: 'dispatches' })}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '14px 20px', borderTop: `1px solid rgba(0,0,0,0.05)`,
                  background: '#fff', cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background 0.12s', border: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = '#fafafd'}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = '#fff'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: muted }}>{d.code}</span>
                  <Pill kind={d.status} dotted />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: ink }}>{d.experimentName || 'Experiment'}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* Awaiting Your Result */}
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '14px 20px', borderBottom: `1px solid rgba(0,0,0,0.05)`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: '#e7f0e9', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <I.ClipboardList size={14} color="#2e6a47"/>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: ink }}>Awaiting Your Result</span>
            </div>
            <span style={{
              padding: '2px 8px', borderRadius: 999,
              background: '#e7f0e9', color: '#2e6a47',
              fontSize: 12, fontWeight: 700,
            }}>{toRecord.length}</span>
          </div>
          <div style={{ maxHeight: 300, overflow: 'auto' }}>
            {toRecord.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: muted, fontSize: 13 }}>
                No results pending
              </div>
            ) : toRecord.map(d => (
              <button 
                key={d.id}
                onClick={() => navigate({ page: 'dispatches', tab: 'record' })}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '14px 20px', borderTop: `1px solid rgba(0,0,0,0.05)`,
                  background: '#fff', cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background 0.12s', border: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = '#fafafd'}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = '#fff'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: muted }}>{d.code}</span>
                  <Pill kind={d.status} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: ink }}>{d.experimentName || 'Experiment'}</div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </Page>
  )
}

export default LabDashboard
