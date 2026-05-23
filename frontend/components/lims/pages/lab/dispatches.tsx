"use client"

import { useState } from "react"
import { Page, Route } from "@/components/lims/shell"
import { Card, Button } from "@/components/lims/primitives"
import * as I from "@/components/lims/icons"
import { useDispatches } from "@/lib/lims/hooks"

interface LabDispatchesProps {
  navigate: (r: Route) => void
  tab?: string
}

const ink = '#1e1e24'
const text2 = '#5a5a6e'
const muted = '#8e8ea0'
const line = 'rgba(0,0,0,0.08)'
const accent = '#6c67b8'

const PILL: Record<string, { label: string; bg: string; fg: string }> = {
  pending:         { label: 'Pending',         bg: '#fef4dd', fg: '#a06618' },
  dispatched:      { label: 'Dispatched',      bg: '#ecedf0', fg: '#5a5a6e' },
  running:         { label: 'Running',         bg: '#ecebf3', fg: '#4f4a8f' },
  unloaded:        { label: 'Unloaded',        bg: '#e3eef3', fg: '#356a82' },
  exception:       { label: 'Exception',       bg: '#fde9d8', fg: '#9a4715' },
  result_recorded: { label: 'Result Recorded', bg: '#e7f0e9', fg: '#2e6a47' },
  completed:       { label: 'Completed',       bg: '#e7f0e9', fg: '#2e6a47' },
  aborted:         { label: 'Aborted',         bg: '#fbe4e6', fg: '#a93445' },
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

const TABS = [
  { id: 'all',    label: 'All',             filter: () => true },
  { id: 'active', label: 'Active',          filter: (d: any) => d.status === 'running' || d.status === 'pending' },
  { id: 'record', label: 'Awaiting Result', filter: (d: any) => d.status === 'unloaded' || d.status === 'exception' },
  { id: 'done',   label: 'Completed',       filter: (d: any) => d.status === 'result_recorded' || d.status === 'completed' },
]

export function LabDispatches({ navigate, tab = 'all' }: LabDispatchesProps) {
  const { data: dispatches, loading, error } = useDispatches()
  const [currentTab, setCurrentTab] = useState(tab)

  const list = (dispatches || [])
  const counts = Object.fromEntries(TABS.map(t => [t.id, list.filter(t.filter).length]))
  const tabFilter = TABS.find(t => t.id === currentTab)?.filter || (() => true)
  const filtered = list.filter(tabFilter)

  return (
    <Page
      title="Dispatches"
      subtitle="派工 — Equipment runs and experiment execution"
      right={<Button variant="dark" icon={<I.Plus size={14}/>} onClick={() => navigate({ page: 'lab_wip' })}>Dispatch WIP</Button>}
    >
      {error && (
        <div style={{
          padding: '12px 16px', marginBottom: 14, borderRadius: 10,
          background: '#fde4e4', color: '#c0394a', fontSize: 13.5, fontWeight: 500,
          border: '1px solid #f6c4c4',
        }}>
          {"Couldn't load dispatches: "}{error}
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
      {loading && list.length === 0 && (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: muted, fontSize: 14 }}>
          Loading…
        </div>
      )}

      {/* Dispatch list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && !loading ? (
          <Card padding={48} style={{ textAlign: 'center', color: muted }}>
            <I.Dispatch size={32} color="#cbcbd6" style={{ marginBottom: 10 }}/>
            <div style={{ fontSize: 14, fontWeight: 600, color: text2 }}>No dispatches in this view</div>
          </Card>
        ) : filtered.map(d => (
          <button key={d.id} type="button" onClick={() => navigate({ page: 'lab_dispatch_detail', id: d.id })} style={{ padding: 0, overflow: 'hidden', background: '#fff', border: `1px solid ${line}`, borderRadius: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr 160px 160px 140px',
              alignItems: 'center', gap: 18,
              padding: '18px 22px',
            }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: accent }}>{d.code}</span>
                <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>{d.created?.split(' ')[0] || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: ink }}>{d.experimentName || 'Experiment'}</div>
                <div style={{ fontSize: 12.5, color: text2, marginTop: 4 }}>{d.recipeName || 'No recipe'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Equipment</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: ink }}>{d.equipmentName || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Operator</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: ink, fontFamily: 'var(--font-mono)' }}>{d.operator || '—'}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Pill kind={d.status} dotted={d.status === 'running'} />
              </div>
            </div>
            {/* Progress bar for running dispatches */}
            {d.status === 'running' && (
              <div style={{ padding: '0 22px 16px' }}>
                <div style={{ position: 'relative', height: 6, background: '#f1eef9', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute', inset: 0, width: `${d.progress || 0}%`,
                    background: 'linear-gradient(90deg, #f4a8bf, #6c67b8)',
                    borderRadius: 999,
                  }}/>
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: muted }}>{d.currentStep || 'Running'} · {Math.round(d.progress || 0)}%</div>
              </div>
            )}
          </button>
        ))}
      </div>
    </Page>
  )
}

export default LabDispatches
