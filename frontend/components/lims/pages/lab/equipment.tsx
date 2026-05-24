"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Page, Route } from "@/components/lims/shell"
import { Card, Button } from "@/components/lims/primitives"
import * as I from "@/components/lims/icons"
import { useEquipment } from "@/lib/lims/hooks"
import { api } from "@/lib/lims/api"

interface LabEquipmentProps {
  navigate: (r: Route) => void
  canManage?: boolean
}

const ink = '#1e1e24'
const text2 = '#5a5a6e'
const muted = '#8e8ea0'
const line = 'rgba(0,0,0,0.08)'
const accent = '#6c67b8'

const PILL: Record<string, { label: string; bg: string; fg: string }> = {
  idle:        { label: 'Idle',        bg: '#e7f0e9', fg: '#2e6a47' },
  running:     { label: 'Running',     bg: '#ecebf3', fg: '#4f4a8f' },
  working:     { label: 'Working',     bg: '#ecebf3', fg: '#4f4a8f' },
  maintenance: { label: 'Maintenance', bg: '#fbe4e6', fg: '#a93445' },
  error:       { label: 'Error',       bg: '#fbe4e6', fg: '#a93445' },
  faulty:      { label: 'Faulty',      bg: '#fbe4e6', fg: '#a93445' },
  offline:     { label: 'Offline',     bg: '#ebebf0', fg: '#5a5a6e' },
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
  { id: 'idle',        label: 'Idle',        filter: (e: any) => e.status === 'idle' },
  { id: 'running',     label: 'Working',     filter: (e: any) => e.status === 'working' || e.status === 'running' },
  { id: 'maintenance', label: 'Maintenance', filter: (e: any) => e.status === 'maintenance' },
]

// Capacity dots visualization
const CapacityDots = ({ capacity }: { capacity: number }) => {
  const cells = Array.from({ length: capacity })
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {cells.map((_, i) => (
        <span key={i} style={{
          width: 9, height: 9, borderRadius: 999,
          background: i < 1 ? accent : '#ececf2',
          boxShadow: i < 1 ? `0 0 6px rgba(108,103,184,0.45)` : 'none',
        }}/>
      ))}
    </div>
  )
}

export function LabEquipment({ canManage = false }: LabEquipmentProps) {
  const { data: equipment, loading, error } = useEquipment()
  const [currentTab, setCurrentTab] = useState('all')
  const [liveById, setLiveById] = useState<Record<string, Partial<any>>>({})
  const pendingRef = useRef<Record<string, Partial<any>>>({})
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const events = new EventSource(api.realtime.equipmentEventsUrl())
    events.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const rows = Array.isArray(data.items) ? data.items : [data.item || data]
        for (const row of rows) {
          const id = String(row.equipment_id || row.id || '')
          if (!id) continue
          pendingRef.current[id] = {
            status: row.equipment_status || row.status,
            progress: row.progress,
            currentStep: row.current_step,
            currentDispatchId: row.dispatch_id || row.current_dispatch_id,
            workerNode: row.worker || row.worker_node_name,
            lastHeartbeat: row.last_heartbeat || row.last_heartbeat_at,
          }
        }
        if (timerRef.current == null) {
          timerRef.current = window.setTimeout(() => {
            const pending = pendingRef.current
            pendingRef.current = {}
            timerRef.current = null
            setLiveById((current) => {
              const next = { ...current }
              for (const [equipmentId, patch] of Object.entries(pending)) {
                next[equipmentId] = { ...(next[equipmentId] || {}), ...patch }
              }
              return next
            })
          }, 1000)
        }
      } catch {}
    }
    return () => {
      events.close()
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
    }
  }, [])

  const list = useMemo(() => (equipment || []).map((item) => ({ ...item, ...(liveById[item.id] || {}) })), [equipment, liveById])
  const counts = Object.fromEntries(TABS.map(t => [t.id, list.filter(t.filter).length]))
  const tabFilter = TABS.find(t => t.id === currentTab)?.filter || (() => true)
  const filtered = list.filter(tabFilter)

  return (
    <Page
      title="Equipment"
      subtitle="設備 — Available test equipment and capacity"
      right={canManage ? <Button variant="dark" icon={<I.Plus size={14}/>}>New Equipment</Button> : undefined}
    >
      {error && (
        <div style={{
          padding: '12px 16px', marginBottom: 14, borderRadius: 10,
          background: '#fde4e4', color: '#c0394a', fontSize: 13.5, fontWeight: 500,
          border: '1px solid #f6c4c4',
        }}>
          {"Couldn't load equipment: "}{error}
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

      {/* Equipment grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {filtered.length === 0 && !loading ? (
          <Card padding={48} style={{ textAlign: 'center', color: muted, gridColumn: '1 / -1' }}>
            <I.Equipment size={32} color="#cbcbd6" style={{ marginBottom: 10 }}/>
            <div style={{ fontSize: 14, fontWeight: 600, color: text2 }}>No equipment in this view</div>
          </Card>
        ) : filtered.map(e => (
          <Card key={e.id} padding={20}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: ink }}>{e.name}</div>
                <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>{e.model}</div>
              </div>
              <Pill kind={e.status} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: muted, marginBottom: 6 }}>Capacity: {e.capacity}</div>
              <CapacityDots capacity={e.capacity} />
            </div>
            {(e.progress || 0) > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ height: 7, borderRadius: 999, overflow: 'hidden', background: '#ececf2' }}>
                  <div style={{ height: '100%', width: `${e.progress || 0}%`, background: '#6c67b8' }} />
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: muted }}>{e.currentStep || 'Running'} · {Math.round(e.progress || 0)}%</div>
              </div>
            )}
            {e.capabilities && e.capabilities.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {e.capabilities.map((cap: any) => (
                  <span key={cap.id} style={{
                    padding: '3px 8px', borderRadius: 6,
                    background: '#f5f5fa', border: `1px solid ${line}`,
                    fontSize: 11, fontWeight: 600, color: text2,
                  }}>
                    {cap.name}
                  </span>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </Page>
  )
}

export default LabEquipment
