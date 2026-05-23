"use client"

import { useState } from "react"
import { Page, Route } from "@/components/lims/shell"
import { Card, Button } from "@/components/lims/primitives"
import * as I from "@/components/lims/icons"
import { useWips } from "@/lib/lims/hooks"
import { api } from "@/lib/lims/api"

interface LabWipProps {
  navigate: (r: Route) => void
}

const ink = '#1e1e24'
const text2 = '#5a5a6e'
const muted = '#8e8ea0'
const line = 'rgba(0,0,0,0.08)'
const accent = '#6c67b8'

const PILL: Record<string, { label: string; bg: string; fg: string }> = {
  created: { label: 'Created', bg: '#ebebf0', fg: '#5a5a6e' },
  ready_for_dispatch: { label: 'Ready', bg: '#e7f0e9', fg: '#2e6a47' },
  dispatched: { label: 'Dispatched', bg: '#ecebf3', fg: '#4f4a8f' },
  running: { label: 'Running', bg: '#ecebf3', fg: '#4f4a8f' },
  in_progress: { label: 'In Progress', bg: '#ecebf3', fg: '#4f4a8f' },
  completed:   { label: 'Completed',   bg: '#dbeafe', fg: '#1d4ed8' },
  failed:      { label: 'Failed',      bg: '#fbe4e6', fg: '#a93445' },
  cancelled:   { label: 'Cancelled',   bg: '#fbe4e6', fg: '#a93445' },
}

const Pill = ({ kind }: { kind: string }) => {
  const p = PILL[kind] || { label: kind, bg: '#ecedf0', fg: '#5a5a6e' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 9px', borderRadius: 999,
      background: p.bg, color: p.fg, fontSize: 11.5, fontWeight: 700,
      letterSpacing: '0.02em', whiteSpace: 'nowrap',
    }}>
      {p.label}
    </span>
  )
}

const TABS = [
  { id: 'all',         label: 'All',         filter: () => true },
  { id: 'active', label: 'Active', filter: (w: any) => ['created', 'ready_for_dispatch', 'dispatched', 'running'].includes(w.status) },
  { id: 'completed',   label: 'Completed',   filter: (w: any) => w.status === 'completed' },
]

export function LabWIP({ navigate }: LabWipProps) {
  const { data: wips, loading, error, refresh } = useWips()
  const [currentTab, setCurrentTab] = useState('all')
  const [busy, setBusy] = useState(false)

  const counts = Object.fromEntries(TABS.map(t => [t.id, (wips || []).filter(t.filter).length]))
  const tabFilter = TABS.find(t => t.id === currentTab)?.filter || (() => true)
  const list = (wips || []).filter(tabFilter)

  return (
    <Page
      title="WIP"
      subtitle="在製 — Work-in-Progress experiments and their dispatch status"
      right={
        <Button variant="dark" icon={<I.Plus size={14}/>} disabled={busy} onClick={async () => { setBusy(true); try { await api.wips.autoCreate(); await refresh() } catch (error) { alert(error instanceof Error ? error.message : String(error)) } finally { setBusy(false) } }}>Auto-group WIP</Button>
      }
    >
      {error && (
        <div style={{
          padding: '12px 16px', marginBottom: 14, borderRadius: 10,
          background: '#fde4e4', color: '#c0394a', fontSize: 13.5, fontWeight: 500,
          border: '1px solid #f6c4c4',
        }}>
          {"Couldn't load WIPs: "}{error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 22, borderBottom: `1px solid ${line}`, marginBottom: 22 }}>
        {TABS.map(t => {
          const active = t.id === currentTab
          return (
            <button 
              key={t.id} 
              onClick={() => setCurrentTab(t.id)} 
              style={{
                position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 0 14px', cursor: 'pointer',
                color: active ? ink : text2,
                fontSize: 14, fontWeight: active ? 700 : 500, fontFamily: 'inherit',
                background: 'transparent', border: 'none',
              }}
            >
              {t.label}
              <span style={{
                minWidth: 22, height: 19, padding: '0 7px',
                borderRadius: 999, fontSize: 11, fontWeight: 700,
                background: active ? ink : '#ebebf0',
                color: active ? '#fff' : '#5a5a6e',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>{counts[t.id]}</span>
              {active && (
                <span style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, background: ink, borderRadius: 2 }}/>
              )}
            </button>
          )
        })}
      </div>

      {/* Loading state */}
      {loading && (wips || []).length === 0 && (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: muted, fontSize: 14 }}>
          Loading…
        </div>
      )}

      {/* WIP list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.length === 0 && !loading ? (
          <Card padding={48} style={{ textAlign: 'center', color: muted }}>
            <I.WIP size={32} color="#cbcbd6" style={{ marginBottom: 10 }}/>
            <div style={{ fontSize: 14, fontWeight: 600, color: text2 }}>No WIPs in this view</div>
          </Card>
        ) : list.map(w => (
          <button key={w.id} type="button" onClick={() => navigate({ page: 'lab_wip_detail', id: w.id })} style={{ padding: 0, overflow: 'hidden', background: '#fff', border: `1px solid ${line}`, borderRadius: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '140px 1fr 100px 100px 100px',
              alignItems: 'center', gap: 18,
              padding: '18px 22px',
            }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: accent }}>{w.code}</span>
                <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>{w.created?.split(' ')[0] || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: ink }}>{w.experimentName || 'Unknown Experiment'}</div>
                {w.note && <div style={{ fontSize: 12.5, color: text2, marginTop: 4 }}>{w.note}</div>}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Samples</div>
                <div style={{ fontWeight: 700, color: ink }}>{w.sampleCount}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Dispatches</div>
                <div style={{ fontWeight: 700, color: ink }}>{w.dispatchCount}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Pill kind={w.status} />
              </div>
            </div>
          </button>
        ))}
      </div>
    </Page>
  )
}

export default LabWIP
