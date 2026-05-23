"use client"

import type { Route } from "@/components/lims/shell"
import { Card, Badge, Button } from "@/components/lims/primitives"
import { useSamples } from "@/lib/lims/hooks"
import type { ReactNode } from "react"

interface LabWaferDetailProps {
  id?: string | number
  navigate: (route: Route) => void
}

export function LabWaferDetail({ id, navigate }: LabWaferDetailProps) {
  const { data: samples, loading } = useSamples()
  const sample = samples.find((item: any) => item.id === String(id) || item.wafer === id)

  if (loading) return <NativeDetail title="Sample Detail">Loading sample...</NativeDetail>
  if (!sample) return <NativeDetail title="Sample Detail">Sample not found.</NativeDetail>

  return (
    <NativeDetail title={sample.wafer} subtitle={'Request #' + (sample.requestId || '—') + ' · ' + sample.size} right={<Button variant="secondary" onClick={() => navigate({ page: 'lab_samples' })}>Back to samples</Button>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 18 }}>
        <Card padding={22}>
          <h2 style={{ fontSize: 15, margin: '0 0 14px' }}>Processing Summary</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>This wafer is tracked through receiving, WIP assignment, dispatch execution, and completion.</p>
        </Card>
        <Card padding={22}>
          <Info label="Status" value={<Badge status={sample.status} />} />
          <Info label="Wafer size" value={sample.size} />
          <Info label="Received" value={sample.receivedAt || sample.arrivedAt || '—'} />
          <Info label="Raw status" value={sample.raw_status || sample.status} />
        </Card>
      </div>
    </NativeDetail>
  )
}

function NativeDetail({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: ReactNode; children: ReactNode }) {
  return <div style={{ padding: '32px 44px 80px', maxWidth: 1280, margin: '0 auto' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 28 }}><div><h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{title}</h1>{subtitle && <div style={{ marginTop: 6, fontSize: 14, color: 'var(--text-secondary)' }}>{subtitle}</div>}</div>{right}</div>{children}</div>
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return <div style={{ marginBottom: 16 }}><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>{label}</div><div style={{ fontSize: 13 }}>{value}</div></div>
}
