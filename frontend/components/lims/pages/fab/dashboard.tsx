'use client';

import React, { useMemo } from 'react';
import { useAuth } from '@/lib/lims/hooks';
import { useRequests } from '@/lib/lims/hooks';
import { Badge } from '@/components/lims/primitives';

import { Plus } from '@/components/lims/icons';

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

const FabStatTile = ({ label, value, icon, tint, accent, onClick }: any) => (
  <button
    onClick={onClick}
    style={{
      position: 'relative',
      textAlign: 'left',
      padding: '16px 18px',
      borderRadius: 14,
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.08)',
      cursor: 'pointer',
      fontFamily: 'inherit',
      overflow: 'hidden',
      transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.15s',
    }}
    onMouseEnter={(e: any) => {
      e.currentTarget.style.borderColor = 'rgba(108,103,184,0.35)';
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 10px 24px -14px rgba(108,103,184,0.35)';
    }}
    onMouseLeave={(e: any) => {
      e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          background: tint,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {React.cloneElement(icon, { color: accent })}
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
        {label}
      </span>
    </div>
    <div
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 34,
        fontWeight: 700,
        color: 'var(--text-primary)',
        letterSpacing: '-0.02em',
        lineHeight: 1,
      }}
    >
      {value}
    </div>
  </button>
);

const BannerHeader = ({ icon, title, count, right }: any) => (
  <div
    style={{
      position: 'relative',
      overflow: 'hidden',
      padding: '20px 24px 18px',
      background: '#1e1e24',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      borderRadius: '14px 14px 0 0',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        {count !== undefined && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{count} items</div>
        )}
      </div>
    </div>
    {right && right}
  </div>
);

export function FabDashboard() {
  const { user } = useAuth();
  const { data: requests } = useRequests();

  const stats = useMemo(() => {
    const submitted = requests.filter((r: any) => r.status === 'submitted').length;
    const inProgress = requests.filter((r: any) => r.status === 'in_progress').length;
    const drafts = requests.filter((r: any) => r.status === 'draft').length;
    const completed = requests.filter((r: any) => r.status === 'completed').length;
    return { submitted, inProgress, drafts, completed };
  }, [requests]);

  const recentRequests = useMemo(() => {
    return requests
      .sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime())
      .slice(0, 5);
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
          Fab Dashboard
        </h1>
        <div style={{ marginTop: 6, fontSize: 14, color: 'var(--text-secondary)' }}>
          Welcome, {user?.display || user?.username}. Track your test requests at a glance.
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
        <FabStatTile
          label="Waiting Approval"
          value={stats.submitted}
          icon={<Plus />}
          tint="rgba(108,103,184,0.1)"
        />
        <FabStatTile
          label="In Progress"
          value={stats.inProgress}
          icon={<Plus />}
          tint="rgba(108,103,184,0.1)"
          accent="#6c67b8"
        />
        <FabStatTile
          label="Drafts"
          value={stats.drafts}
          icon={<Plus />}
          tint="rgba(108,103,184,0.1)"
          accent="#6c67b8"
        />
        <FabStatTile
          label="Completed"
          value={stats.completed}
          icon={<Plus />}
          tint="rgba(108,103,184,0.1)"
          accent="#6c67b8"
        />
      </div>

      <FabCard padding={0}>
        <BannerHeader
          icon="📋"
          title="Recent Requests"
          count={recentRequests.length}
          accent="#6c67b8"
        />
        <div style={{ padding: 24 }}>
          {recentRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
              No requests yet. Start by creating a new request.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentRequests.map((req: any) => (
                <div
                  key={req.id}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: 'rgba(108,103,184,0.02)',
                    border: '1px solid rgba(108,103,184,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{req.title}</div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        marginTop: 2,
                      }}
                    >
                      Created {req.created}
                    </div>
                  </div>
                  <Badge status={req.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </FabCard>
    </div>
  );
}
