"use client"

import type { Route } from "@/components/lims/shell"
import { Card, Badge, Button } from "@/components/lims/primitives"
import { api } from "@/lib/lims/api"
import { useDispatchDetail } from "@/lib/lims/hooks"
import { useEffect, useState, type ReactNode } from "react"

interface LabDispatchDetailProps {
  id?: string | number
  navigate: (route: Route) => void
}

export function LabDispatchDetail({ id, navigate }: LabDispatchDetailProps) {
  const dispatchId = id == null ? null : String(id)
  const { data: dispatch, loading, refresh } = useDispatchDetail(dispatchId)
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    if (!dispatchId) return
    const events = new EventSource(api.dispatches.eventUrl(dispatchId))
    events.onmessage = () => refresh()
    api.dispatches.logs(dispatchId).then(setLogs).catch(() => setLogs([]))
    return () => events.close()
  }, [dispatchId, refresh])

  if (loading) return <Detail title="Dispatch Detail">Loading dispatch...</Detail>
  if (!dispatch) return <Detail title="Dispatch Detail">Dispatch not found.</Detail>

  return (
    <Detail title={dispatch.code} subtitle={dispatch.experimentName || 'Experiment dispatch'} right={<Button variant="secondary" onClick={() => navigate({ page: 'lab_dispatches' })}>Back to dispatches</Button>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 18 }}>
        <Card padding={22}>
          <h2 style={{ fontSize: 15, margin: '0 0 14px' }}>Execution</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {['pending', 'running', 'result_recorded', 'exception'].map((step) => <div key={step} style={{ padding: 12, borderRadius: 10, background: dispatch.status === step ? '#ecebf3' : '#f7f8fa', color: dispatch.status === step ? '#4f4a8f' : 'var(--text-secondary)', fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>{step.replace(/_/g, ' ')}</div>)}
          </div>
          <div style={{ marginTop: 18 }}>
            <div style={{ height: 8, borderRadius: 999, background: '#ececf2', overflow: 'hidden' }}>
              <div style={{ width: `${dispatch.progress || 0}%`, height: '100%', background: '#6c67b8' }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>{dispatch.currentStep || 'Waiting'} · {Math.round(dispatch.progress || 0)}%</div>
          </div>
          <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
            {dispatch.raw_status === 'failed' && <Button variant="dark" onClick={async () => { await api.dispatches.retry(dispatch.id); await refresh() }}>Retry</Button>}
            {!['completed', 'failed', 'cancelled'].includes(dispatch.raw_status || '') && <Button variant="danger" onClick={async () => { await api.dispatches.cancel(dispatch.id); await refresh() }}>Cancel</Button>}
          </div>
          {logs.length > 0 && (
            <div style={{ marginTop: 18, maxHeight: 220, overflow: 'auto', background: '#111827', color: '#d1d5db', borderRadius: 10, padding: 12, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              {logs.slice(-12).map((log, index) => <div key={index}>{log.created_at || ''} {log.level || 'info'} · {log.message}</div>)}
            </div>
          )}
        </Card>
        <Card padding={22}>
          <Info label="Status" value={<Badge status={dispatch.status} />} />
          <Info label="Equipment" value={dispatch.equipmentName || '—'} />
          <Info label="Recipe" value={dispatch.recipeName || '—'} />
          <Info label="Operator" value={dispatch.operator || '—'} />
          <Info label="Created" value={dispatch.created || '—'} />
        </Card>
      </div>
    </Detail>
  )
}

function Detail({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: ReactNode; children: ReactNode }) {
  return <div style={{ padding: '32px 44px 80px', maxWidth: 1280, margin: '0 auto' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 28 }}><div><h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{title}</h1>{subtitle && <div style={{ marginTop: 6, fontSize: 14, color: 'var(--text-secondary)' }}>{subtitle}</div>}</div>{right}</div>{children}</div>
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return <div style={{ marginBottom: 16 }}><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>{label}</div><div style={{ fontSize: 13 }}>{value}</div></div>
}
