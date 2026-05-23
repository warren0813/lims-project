"use client"

import type { Route } from "@/components/lims/shell"
import { Card, Badge, Button } from "@/components/lims/primitives"
import { api } from "@/lib/lims/api"
import { useRequestDetail } from "@/lib/lims/hooks"
import { useState, type ReactNode } from "react"

interface MgrRequestDetailProps {
  id?: string | number
  navigate: (route: Route) => void
}

export function MgrRequestDetail({ id, navigate }: MgrRequestDetailProps) {
  const requestId = id == null ? null : String(id)
  const { data: request, loading, refresh } = useRequestDetail(requestId)
  const [busy, setBusy] = useState(false)

  if (loading) return <Detail title="Request Review">Loading request...</Detail>
  if (!request) return <Detail title="Request Review">Request not found.</Detail>

  return (
    <Detail title={request.title || 'Request #' + request.id} subtitle={(request.requestNo || request.id) + ' · ' + (request.requester?.username || 'fab user')} right={<Button variant="secondary" onClick={() => navigate({ page: 'mgr_all_requests' })}>Back to requests</Button>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 18 }}>
        <Card padding={22}>
          <h2 style={{ fontSize: 15, margin: '0 0 14px' }}>Samples</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(request.samples || []).map((sample: any) => <div key={sample.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, borderRadius: 10, background: '#f7f8fa' }}><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{sample.wafer}</span><Badge status={sample.status} /></div>)}
          </div>
        </Card>
        <Card padding={22}>
          <Info label="Status" value={<Badge status={request.status} />} />
          <Info label="Urgency" value={<Badge status={request.urgency} />} />
          <Info label="Created" value={request.created || '—'} />
          <Info label="Submitted" value={request.submitted || '—'} />
          {request.status === 'submitted' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button variant="success" disabled={busy} onClick={async () => { setBusy(true); await api.requests.approve(request.id, { comment: 'Approved from manager review' }); await refresh(); setBusy(false) }}>Approve</Button>
              <Button variant="danger" disabled={busy} onClick={async () => { setBusy(true); await api.requests.reject(request.id, 'Rejected from manager review'); await refresh(); setBusy(false) }}>Reject</Button>
            </div>
          )}
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
