'use client';

import React, { useState, useMemo } from 'react';
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

export function MgrReports() {
  const { data: requests } = useRequests();
  const [timeRange, setTimeRange] = useState('30d');

  const stats = useMemo(() => {
    const total = requests.length;
    const completed = requests.filter((r: any) => r.status === 'completed').length;
    const inProgress = requests.filter((r: any) => r.status === 'in_progress').length;
    const rejected = requests.filter((r: any) => r.status === 'rejected').length;

    return {
      total,
      completed,
      inProgress,
      rejected,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgTurnaround: '4.2 days',
    };
  }, [requests]);

  const experimentBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    requests.forEach((r: any) => {
      r.expIds?.forEach((id: string) => {
        breakdown[id] = (breakdown[id] || 0) + 1;
      });
    });
    return Object.entries(breakdown).map(([exp, count]) => ({ exp, count }));
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
          Reports & Analytics
        </h1>
        <div style={{ marginTop: 6, fontSize: 14, color: 'var(--text-secondary)' }}>
          Overview of lab performance and request metrics.
        </div>
      </div>

      <div style={{ marginBottom: 24, display: 'flex', gap: 8 }}>
        {['7d', '30d', '90d'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.12)',
              background: timeRange === range ? '#1e1e24' : '#fff',
              color: timeRange === range ? '#fff' : 'var(--text-primary)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'Last 90 days'}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <FabCard>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Total Requests
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
            All time
          </div>
        </FabCard>

        <FabCard>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Completion Rate
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#2e6a47',
            }}
          >
            {stats.completionRate}%
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
            {stats.completed} completed
          </div>
        </FabCard>

        <FabCard>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            In Progress
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#2a7a91' }}>
            {stats.inProgress}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
            Active tests
          </div>
        </FabCard>

        <FabCard>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Avg Turnaround
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)' }}>
            {stats.avgTurnaround}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
            Estimated
          </div>
        </FabCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <FabCard>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 20, color: 'var(--text-primary)' }}>
            Experiment Breakdown
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {experimentBreakdown.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                No data available
              </div>
            ) : (
              experimentBreakdown.map(({ exp, count }) => (
                <div key={exp}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {exp.toUpperCase()}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {count}
                    </span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: 8,
                      borderRadius: 4,
                      background: 'rgba(0,0,0,0.08)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${(count / stats.total) * 100}%`,
                        background: '#6c67b8',
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </FabCard>

        <FabCard>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 20, color: 'var(--text-primary)' }}>
            Status Distribution
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Completed', count: stats.completed, color: '#2e6a47' },
              { label: 'In Progress', count: stats.inProgress, color: '#2a7a91' },
              { label: 'Rejected', count: stats.rejected, color: '#c0394a' },
            ].map(({ label, count, color }) => (
              <div key={label}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {label}
                  </span>
                  <span style={{ color, fontWeight: 600 }}>{count}</span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: 8,
                    borderRadius: 4,
                    background: 'rgba(0,0,0,0.08)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${(count / stats.total) * 100}%`,
                      background: color,
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </FabCard>
      </div>

      <FabCard>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 20, color: 'var(--text-primary)' }}>
          Recent Activity
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests.slice(0, 5).map((req: any, idx: number) => (
            <div
              key={idx}
              style={{
                padding: 12,
                borderRadius: 8,
                background: 'rgba(0,0,0,0.02)',
                fontSize: 13,
                color: 'var(--text-secondary)',
              }}
            >
              Request <strong>{req.title}</strong> — {req.status}
            </div>
          ))}
        </div>
      </FabCard>
    </div>
  );
}
