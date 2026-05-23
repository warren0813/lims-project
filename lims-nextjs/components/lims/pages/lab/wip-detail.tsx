"use client"

import type { Route } from "@/components/lims/shell"
import { Card, Badge, Button } from "@/components/lims/primitives"
import { api } from "@/lib/lims/api"
import { useWipDetail } from "@/lib/lims/hooks"
import { useState, type ReactNode } from "react"

interface LabWipDetailProps {
  id?: string | number
  navigate: (route: Route) => void
}

export function LabWipDetail({ id, navigate }: LabWipDetailProps) {
  const wipId = id == null ? null : String(id)
  const { data: wip, loading, refresh } = useWipDetail(wipId)
  const [busy, setBusy] = useState(false)

  if (loading) return <Detail title="WIP Detail">Loading WIP...</Detail>
  if (!wip) return <Detail title="WIP Detail">WIP not found.</Detail>

  return (
    <Detail title={wip.code} subtitle={wip.experimentName} right={<Button variant="secondary" onClick={() => navigate({ page: 'lab_wip' })}>Back to WIP</Button>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 18 }}>
        <Card padding={22}>
          <h2 style={{ fontSize: 15, margin: '0 0 14px' }}>Samples</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(wip.samples || []).map((sample: any) => <div key={sample.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, borderRadius: 10, background: '#f7f8fa' }}><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{sample.wafer}</span><Badge status={sample.status} /></div>)}
          </div>
        </Card>
        <Card padding={22}>
          <Info label="Status" value={<Badge status={wip.status} />} />
          <Info label="Samples" value={wip.sampleCount} />
          <Info label="Dispatches" value={wip.dispatchCount} />
          <Info label="Created" value={wip.created || '—'} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {wip.status === 'created' && <Button variant="dark" disabled={busy} onClick={async () => { setBusy(true); await api.wips.lock(wip.id); await refresh(); setBusy(false) }}>Lock WIP</Button>}
            {wip.status === 'ready_for_dispatch' && <Button variant="success" disabled={busy} onClick={async () => { setBusy(true); const dispatch = await api.wips.createDispatch(wip.id, {}); setBusy(false); navigate({ page: 'lab_dispatch_detail', id: dispatch.id }) }}>Dispatch</Button>}
            {!['completed', 'cancelled', 'running', 'dispatched'].includes(wip.status) && <Button variant="danger" disabled={busy} onClick={async () => { setBusy(true); await api.wips.cancel(wip.id); await refresh(); setBusy(false) }}>Cancel</Button>}
          </div>
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
