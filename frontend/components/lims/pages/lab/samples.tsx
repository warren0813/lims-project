"use client"

import { useState } from "react"
import { Page, Route } from "@/components/lims/shell"
import { Card, Button, Modal, FieldLabel, TextArea } from "@/components/lims/primitives"
import * as I from "@/components/lims/icons"
import { useSamples, useRequests } from "@/lib/lims/hooks"
import { api } from "@/lib/lims/api"

interface LabSamplesProps {
  navigate: (r: Route) => void
  tab?: string
}

const ink = '#1e1e24'
const text2 = '#5a5a6e'
const muted = '#8e8ea0'
const line = 'rgba(0,0,0,0.08)'
const accent = '#6c67b8'

const PILL: Record<string, { label: string; bg: string; fg: string }> = {
  incoming:  { label: 'Incoming',  bg: '#fef4dd', fg: '#a06618' },
  received:  { label: 'Received',  bg: '#e7f0e9', fg: '#2e6a47' },
  rejected:  { label: 'Rejected',  bg: '#fbe4e6', fg: '#a93445' },
  in_wip:    { label: 'In WIP',    bg: '#ecebf3', fg: '#4f4a8f' },
  completed: { label: 'Completed', bg: '#dbeafe', fg: '#1d4ed8' },
  '3d':      { label: '3 Days',    bg: '#fbe4e6', fg: '#a93445' },
  '1w':      { label: '1 Week',    bg: '#ecebf3', fg: '#4f4a8f' },
  '2w':      { label: '2 Weeks',   bg: '#eef0ed', fg: '#4d5a4f' },
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
  { id: 'all',       label: 'All',       filter: () => true },
  { id: 'incoming',  label: 'Incoming',  filter: (s: any) => s.status === 'incoming' },
  { id: 'received',  label: 'Received',  filter: (s: any) => s.status === 'received' },
  { id: 'in_wip',    label: 'In WIP',    filter: (s: any) => s.status === 'in_wip' },
  { id: 'completed', label: 'Completed', filter: (s: any) => s.status === 'completed' },
]

export function LabSamples({ navigate, tab = 'all' }: LabSamplesProps) {
  const { data: samples, loading, error, refresh } = useSamples()
  const { data: requests } = useRequests()
  const [currentTab, setCurrentTab] = useState(tab)
  const [rejectModal, setRejectModal] = useState<{ id: string; wafer: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [busy, setBusy] = useState(false)

  // Join urgency from requests
  const requestsById = new Map((requests || []).map(r => [r.id, r]))
  const wafers = (samples || []).map(s => ({
    ...s,
    urgency: requestsById.get(s.requestId || '')?.urgency || '1w',
  }))

  const counts = Object.fromEntries(TABS.map(t => [t.id, wafers.filter(t.filter).length]))
  const tabFilter = TABS.find(t => t.id === currentTab)?.filter || (() => true)
  const list = wafers.filter(tabFilter)

  const handleReceive = async (id: string) => {
    setBusy(true)
    try {
      await api.samples.receive(id)
      refresh()
    } catch (e) {
      alert('Failed to receive sample: ' + (e instanceof Error ? e.message : String(e)))
    }
    setBusy(false)
  }

  const handleReject = async () => {
    if (!rejectModal) return
    setBusy(true)
    try {
      await api.samples.reject(rejectModal.id, rejectReason)
      refresh()
      setRejectModal(null)
      setRejectReason('')
    } catch (e) {
      alert('Failed to reject sample: ' + (e instanceof Error ? e.message : String(e)))
    }
    setBusy(false)
  }

  return (
    <Page
      title="Samples"
      subtitle="樣品 — Receive, track, and process wafers from approved requests"
      right={
        <Button variant="dark" icon={<I.Inbox size={14}/>}>Bulk receive</Button>
      }
    >
      {error && (
        <div style={{
          padding: '12px 16px', marginBottom: 14, borderRadius: 10,
          background: '#fde4e4', color: '#c0394a', fontSize: 13.5, fontWeight: 500,
          border: '1px solid #f6c4c4',
        }}>
          {"Couldn't load samples: "}{error}
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
      {loading && wafers.length === 0 && (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: muted, fontSize: 14 }}>
          Loading…
        </div>
      )}

      {/* Sample list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.length === 0 && !loading ? (
          <Card padding={48} style={{ textAlign: 'center', color: muted }}>
            <I.Flask size={32} color="#cbcbd6" style={{ marginBottom: 10 }}/>
            <div style={{ fontSize: 14, fontWeight: 600, color: text2 }}>No samples in this view</div>
          </Card>
        ) : list.map(s => (
          <div
            key={s.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate({ page: 'lab_wafer', id: s.id })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                navigate({ page: 'lab_wafer', id: s.id })
              }
            }}
            style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr 100px 110px 140px',
              alignItems: 'center', gap: 18,
              padding: '16px 22px', borderRadius: 12,
              background: '#fff', border: `1px solid ${line}`, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <I.Wafer size={15} color={accent}/>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: ink }}>{s.wafer}</span>
              </div>
              <div style={{ fontSize: 12, color: muted, marginTop: 4, marginLeft: 23 }}>{s.size}</div>
            </div>
            <div style={{ fontSize: 13, color: text2 }}>
              Request #{s.requestId}
            </div>
            <Pill kind={s.urgency} />
            <Pill kind={s.status} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {s.status === 'incoming' && (
                <>
                  <Button 
                    variant="success" 
                    size="sm" 
                    icon={<I.Check size={13}/>}
                    disabled={busy}
                    onClick={(e) => { e.stopPropagation(); handleReceive(s.id) }}
                  >
                    Receive
                  </Button>
                  <Button 
                    variant="danger" 
                    size="sm" 
                    icon={<I.X size={13}/>}
                    disabled={busy}
                    onClick={(e) => { e.stopPropagation(); setRejectModal({ id: s.id, wafer: s.wafer }) }}
                  >
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Reject Modal */}
      <Modal
        open={!!rejectModal}
        onClose={() => { setRejectModal(null); setRejectReason('') }}
        title={`Reject ${rejectModal?.wafer || 'sample'}`}
        width={480}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setRejectModal(null); setRejectReason('') }}>Cancel</Button>
            <Button 
              variant="danger" 
              disabled={!rejectReason.trim() || busy}
              onClick={handleReject}
            >
              Reject
            </Button>
          </>
        }
      >
        <div>
          <FieldLabel required>Reason</FieldLabel>
          <TextArea 
            value={rejectReason} 
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Describe why this sample is being rejected..."
          />
        </div>
      </Modal>
    </Page>
  )
}

export default LabSamples
