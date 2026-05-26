'use client';

import React, { useState, useMemo } from 'react';
import type { Route } from '@/components/lims/shell';
import { useRequests } from '@/lib/lims/hooks';
import { Badge } from '@/components/lims/primitives';

const FabCard = ({ children, padding = 22, style }: any) => (
  <div
    style={{
      background: '#fff',
      borderRadius: 14,
      border: '1px solid rgba(0,0,0,0.07)',
      padding,
      boxShadow: '0 1px 2px rgba(30,30,36,0.03)',
      ...style,
    }}
  >
    {children}
  </div>
);

const WORKFLOW_STEPS = ['submitted', 'received', 'in_progress', 'completed'];

const stepFromRequest = (r: any) => {
  if (
    r.status === 'draft' ||
    r.status === 'cancelled' ||
    r.status === 'rejected' ||
    r.status === 'returned'
  ) {
    return { aborted: true, status: r.status };
  }
  if (r.status === 'completed') return { idx: 3 };
  const total = r.samples.length || 1;
  const received = r.samples.filter((s: any) => s.status === 'received').length;
  if (received === 0) return { idx: 0 };
  if (received < total) return { idx: 1 };
  return { idx: 2 };
};

const FlowDotsComponent = ({ request }: any) => {
  const s = stepFromRequest(request);
  if (s.aborted) {
    const colors: any = {
      draft: { dot: '#a8a8b8', text: 'Draft' },
      cancelled: { dot: '#a8a8b8', text: 'Cancelled' },
      rejected: { dot: '#c0394a', text: 'Rejected' },
      returned: { dot: '#a73d56', text: 'Returned' },
    };
    const color = colors[s.status] || { dot: '#a8a8b8', text: s.status };
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'inline-flex', gap: 4 }}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: i === 0 ? color.dot : 'rgba(0,0,0,0.09)',
                opacity: i === 0 ? 0.7 : 1,
              }}
            />
          ))}
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{color.text}</span>
      </span>
    );
  }

  const idx = s.idx ?? 0;
  const total = request.samples.length;
  const received = request.samples.filter((x: any) => x.status === 'received').length;
  const labels = ['Submitted', `Received ${received}/${total}`, 'In progress', 'Completed'];

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ display: 'inline-flex', gap: 4 }}>
        {WORKFLOW_STEPS.map((step, i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: i <= idx ? '#6c67b8' : 'rgba(0,0,0,0.09)',
            }}
          />
        ))}
      </span>
      <span style={{ fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {labels[idx]}
      </span>
    </span>
  );
};

interface FabRequestsProps { navigate?: (route: Route) => void; initialTab?: string }

export function FabRequests({ navigate, initialTab = 'all' }: FabRequestsProps) {
  const { data: requests } = useRequests();
  const [filter, setFilter] = useState(initialTab);

  const filtered = useMemo(() => {
    if (filter === 'all') return requests;
    return requests.filter((r: any) => r.status === filter);
  }, [requests, filter]);

  const statuses = ['pending', 'submitted', 'in_progress', 'completed', 'cancelled'];

  return (
    <div style={{ padding: '32px 44px 80px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          My Requests
        </h1>
        <div style={{ marginTop: 6, fontSize: 14, color: 'var(--text-secondary)' }}>
          View and manage your test requests.
        </div>
      </div>

      <div style={{ marginBottom: 24, display: 'flex', gap: 8 }}>
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.12)',
              background: filter === status ? '#1e1e24' : '#fff',
              color: filter === status ? '#fff' : 'var(--text-primary)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {status.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <FabCard padding={0}>
        <div style={{ padding: 24 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
              No requests found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filtered.map((req: any) => (
                <button
                  type="button"
                  key={req.id}
                  onClick={() => navigate?.({ page: 'fab_request', id: req.id })}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    border: '1px solid rgba(0,0,0,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    width: '100%',
                    textAlign: 'left',
                    background: '#fff',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        marginBottom: 4,
                      }}
                    >
                      {req.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        marginBottom: 8,
                      }}
                    >
                      {req.samples?.length || 0} sample{(req.samples?.length || 0) !== 1 ? 's' : ''}
                    </div>
                    <FlowDotsComponent request={req} />
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Badge status={req.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </FabCard>
    </div>
  );
}
