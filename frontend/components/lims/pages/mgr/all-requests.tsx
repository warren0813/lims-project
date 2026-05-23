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

interface MgrAllRequestsProps { navigate?: (route: Route) => void }

export function MgrAllRequests({ navigate }: MgrAllRequestsProps) {
  const { data: requests } = useRequests();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    let result = requests;

    if (filter !== 'all') {
      result = result.filter((r: any) => r.status === filter);
    }

    if (searchTerm) {
      result = result.filter((r: any) =>
        r.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result.sort(
      (a: any, b: any) =>
        new Date(b.created).getTime() - new Date(a.created).getTime()
    );
  }, [requests, filter, searchTerm]);

  const statuses = ['all', 'submitted', 'in_progress', 'completed', 'rejected', 'returned'];

  const stats = useMemo(() => {
    return {
      submitted: requests.filter((r: any) => r.status === 'submitted').length,
      inProgress: requests.filter((r: any) => r.status === 'in_progress').length,
      completed: requests.filter((r: any) => r.status === 'completed').length,
      total: requests.length,
    };
  }, [requests]);

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
          All Requests
        </h1>
        <div style={{ marginTop: 6, fontSize: 14, color: 'var(--text-secondary)' }}>
          Review and manage all submitted test requests.
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: 'rgba(108,103,184,0.05)',
            border: '1px solid rgba(108,103,184,0.15)',
          }}
        >
          <div
            style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}
          >
            Total Requests
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
            {stats.total}
          </div>
        </div>
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: 'rgba(254,240,212,0.3)',
            border: '1px solid rgba(184,114,14,0.2)',
          }}
        >
          <div
            style={{ fontSize: 11, fontWeight: 600, color: '#b8720e', marginBottom: 6 }}
          >
            Pending Review
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#b8720e' }}>
            {stats.submitted}
          </div>
        </div>
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: 'rgba(212,234,240,0.3)',
            border: '1px solid rgba(42,122,145,0.2)',
          }}
        >
          <div
            style={{ fontSize: 11, fontWeight: 600, color: '#2a7a91', marginBottom: 6 }}
          >
            In Progress
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#2a7a91' }}>
            {stats.inProgress}
          </div>
        </div>
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: 'rgba(219,234,254,0.3)',
            border: '1px solid rgba(29,78,216,0.2)',
          }}
        >
          <div
            style={{ fontSize: 11, fontWeight: 600, color: '#1d4ed8', marginBottom: 6 }}
          >
            Completed
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1d4ed8' }}>
            {stats.completed}
          </div>
        </div>
      </div>

      <FabCard padding={0}>
        <div style={{ padding: 20, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid rgba(0,0,0,0.12)',
              borderRadius: 8,
              fontSize: 13,
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ padding: 20, borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', gap: 8, overflowX: 'auto' }}>
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
                whiteSpace: 'nowrap',
              }}
            >
              {status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div style={{ padding: 24 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
              No requests found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((req: any) => (
                <div
                  key={req.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate?.({ page: 'mgr_request', id: req.id })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate?.({ page: 'mgr_request', id: req.id })
                    }
                  }}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    border: '1px solid rgba(0,0,0,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    width: '100%',
                    background: '#fff',
                    textAlign: 'left',
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
                        marginBottom: 4,
                      }}
                    >
                      {req.samples?.length || 0} sample{(req.samples?.length || 0) !== 1 ? 's' : ''} •{' '}
                      {req.created}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {req.status === 'submitted' && (
                      <button
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          background: '#1e1e24',
                          color: '#fff',
                          fontWeight: 600,
                          fontSize: 12,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Review
                      </button>
                    )}
                    <Badge status={req.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </FabCard>
    </div>
  );
}
