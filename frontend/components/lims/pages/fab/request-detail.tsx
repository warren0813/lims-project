"use client"

import type { Route } from "@/components/lims/shell"
import { Card, Badge, Button } from "@/components/lims/primitives"
import * as I from "@/components/lims/icons"
import { useRequestDetail } from "@/lib/lims/hooks"
import type { ReactNode } from "react"

interface FabRequestDetailProps {
  id?: string | number
  navigate: (route: Route) => void
}

export function FabRequestDetail({ id, navigate }: FabRequestDetailProps) {
  const requestId = id == null ? null : String(id)
  const { data: request, loading, error } = useRequestDetail(requestId)

  if (loading) return <DetailShell title="Request Detail">Loading request...</DetailShell>
  if (error || !request) return <DetailShell title="Request Detail">Request not found.</DetailShell>

  return (
    <DetailShell
      title={request.title || 'Request #' + request.id}
      subtitle={(request.requestNo || request.id) + ' · ' + (request.sampleCount || request.samples?.length || 0) + ' sample(s)'}
      right={<Button variant="secondary" icon={<I.ChevronRight size={14}/>} onClick={() => navigate({ page: 'fab_requests' })}>Back</Button>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 18 }}>
        <Card padding={22}>
          <SectionTitle>Samples</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(request.samples || []).map((sample: any) => (
              <div key={sample.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center', padding: 12, borderRadius: 10, background: '#f7f8fa' }}>
                <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{sample.wafer}</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{sample.size}</span>
                <Badge status={sample.status} />
              </div>
            ))}
          </div>
        </Card>

        <Card padding={22}>
          <SectionTitle>Status</SectionTitle>
          <Info label="Current state" value={<Badge status={request.status} />} />
          <Info label="Urgency" value={<Badge status={request.urgency} />} />
          <Info label="Created" value={request.created || '—'} />
          <Info label="Submitted" value={request.submitted || '—'} />
          {request.note && <Info label="Notes" value={request.note} />}
        </Card>
      </div>
    </DetailShell>
  )
}

function DetailShell({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ padding: '32px 44px 80px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h1>
          {subtitle && <div style={{ marginTop: 6, fontSize: 14, color: 'var(--text-secondary)' }}>{subtitle}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)' }}>{children}</div>
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return <div style={{ marginBottom: 16 }}><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>{label}</div><div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{value}</div></div>
}
