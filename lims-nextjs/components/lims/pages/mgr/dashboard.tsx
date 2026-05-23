'use client';

import React, { useMemo } from 'react';
import type { Route } from '@/components/lims/shell';
import { useRequests } from '@/lib/lims/hooks';

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

const StatTile = ({ label, value, accent, valueBg }: any) => (
  <FabCard padding={20} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 12,
        background: valueBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 26,
          fontWeight: 700,
          color: accent,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
  </FabCard>
);

interface MgrDashboardProps { navigate?: (route: Route) => void }

export function MgrDashboard({ navigate }: MgrDashboardProps) {
  const { data: requests } = useRequests();

  const stats = useMemo(() => {
    return {
      pending: requests.filter((r: any) => r.status === 'submitted').length,
      inProgress: requests.filter((r: any) => r.status === 'in_progress').length,
      completed: requests.filter((r: any) => r.status === 'completed').length,
      rejected: requests.filter((r: any) => r.status === 'rejected').length,
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
          Manager Dashboard
        </h1>
        <div style={{ marginTop: 6, fontSize: 14, color: 'var(--text-secondary)' }}>
          Manage lab operations and review test requests.
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <StatTile
          label="Pending Review"
          value={stats.pending}
          accent="#b8720e"
          valueBg="rgba(254,240,212,0.3)"
        />
        <StatTile
          label="In Progress"
          value={stats.inProgress}
          accent="#2a7a91"
          valueBg="rgba(212,234,240,0.3)"
        />
        <StatTile
          label="Completed"
          value={stats.completed}
          accent="#2e6a47"
          valueBg="rgba(231,240,233,0.3)"
        />
        <StatTile
          label="Rejected"
          value={stats.rejected}
          accent="#c0394a"
          valueBg="rgba(251,228,230,0.3)"
        />
      </div>

      <FabCard padding={24}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 20, color: 'var(--text-primary)' }}>
          Quick Actions
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => navigate?.({ page: 'mgr_all_requests' })}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 10,
              background: '#1e1e24',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Review Pending Requests
          </button>
          <button
            onClick={() => navigate?.({ page: 'mgr_reports' })}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 10,
              background: '#f7f8fa',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: 14,
              border: '1px solid rgba(0,0,0,0.12)',
              cursor: 'pointer',
            }}
          >
            View Reports
          </button>
        </div>
      </FabCard>
    </div>
  );
}
