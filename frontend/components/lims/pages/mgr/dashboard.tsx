'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Route } from '@/components/lims/shell';
import * as I from '@/components/lims/icons';
import { api, type ActivityEvent, type DashboardChart, type DashboardStats } from '@/lib/lims/api';

interface MgrDashboardProps { navigate?: (route: Route) => void }

type Period = '7d' | '30d' | '90d';
type Metric = 'samples' | 'wip' | 'equipment';

const emptyStats: DashboardStats = {
  toApprove: { current: 0, previous: 0, delta: 0, deltaPercent: null },
  inProgress: { current: 0, previous: 0, delta: 0, deltaPercent: null },
  completed: { current: 0, previous: 0, delta: 0, deltaPercent: null },
  equipment: { current: 0, previous: 0, delta: 0, deltaPercent: null },
};

const emptyChart: DashboardChart = { labels: [], dailyCount: [], utilizationPct: [], anomalies: [] };

const Card = ({ children, padding = 22, style, onClick }: any) => (
  <div
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (event) => {
      if (event.key === 'Enter' || event.key === ' ') onClick();
    } : undefined}
    style={{
      width: '100%',
      textAlign: 'left',
      background: '#fff',
      borderRadius: 14,
      border: '1px solid rgba(0,0,0,0.07)',
      padding,
      boxShadow: '0 1px 2px rgba(30,30,36,0.03)',
      cursor: onClick ? 'pointer' : 'default',
      fontFamily: 'inherit',
      ...style,
    }}
  >
    {children}
  </div>
);

function deltaTone(key: keyof DashboardStats, delta: number) {
  if (delta === 0) return { bg: '#f1f1f5', fg: '#5a5a6e' };
  const decreaseGood = key === 'toApprove' || key === 'inProgress';
  const good = decreaseGood ? delta < 0 : delta > 0;
  return good ? { bg: '#e7f6ec', fg: '#157a4a' } : { bg: '#fde4e4', fg: '#c0394a' };
}

function StatCard({ label, bucketKey, bucket, accent, icon, onClick }: {
  label: string
  bucketKey: keyof DashboardStats
  bucket: DashboardStats[keyof DashboardStats]
  accent: string
  icon: React.ReactNode
  onClick: () => void
}) {
  const tone = deltaTone(bucketKey, bucket.delta);
  const pct = bucket.deltaPercent == null ? 'n/a' : `${bucket.deltaPercent > 0 ? '+' : ''}${bucket.deltaPercent}%`;
  return (
    <Card onClick={onClick} padding={18} style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}18`, color: accent, display: 'grid', placeItems: 'center' }}>
          {icon}
        </span>
        <span style={{ padding: '4px 8px', borderRadius: 999, background: tone.bg, color: tone.fg, fontSize: 11, fontWeight: 800 }}>
          {bucket.delta > 0 ? '+' : ''}{bucket.delta} vs last 30d
        </span>
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{bucket.current}</div>
        <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>{pct} change from prior period</div>
      </div>
    </Card>
  );
}

function relativeTime(value: string) {
  const diff = Math.max(Date.now() - new Date(value).getTime(), 0);
  const min = Math.round(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min} minutes ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hours ago`;
  return `${Math.round(hr / 24)} days ago`;
}

export function MgrDashboard({ navigate }: MgrDashboardProps) {
  const [period, setPeriod] = useState<Period>('30d');
  const [metric, setMetric] = useState<Metric>('samples');
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [chart, setChart] = useState<DashboardChart>(emptyChart);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [alerts, setAlerts] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [nextStats, nextChart, nextActivity, nextAlerts] = await Promise.all([
          api.dashboard.stats(period),
          api.dashboard.chart(metric, period),
          api.activity.recent(5),
          api.equipment.alerts(),
        ]);
        if (!active) return;
        setStats(nextStats);
        setChart(nextChart);
        setActivity(nextActivity);
        setAlerts(nextAlerts.count);
        setError('');
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : String(err));
      }
    }
    load();
    const id = window.setInterval(load, 30000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [metric, period]);

  const chartData = useMemo(() => chart.labels.map((label, index) => ({
    date: label,
    dailyCount: chart.dailyCount[index] || 0,
    utilizationPct: Math.round((chart.utilizationPct[index] || 0) * 100),
    anomaly: chart.anomalies.some((item) => item.date === label),
  })), [chart]);
  const anomalySet = new Set(chart.anomalies.map((item) => item.date));

  return (
    <div style={{ padding: '32px 44px 80px', maxWidth: 1320, margin: '0 auto' }}>
      <style jsx>{`
        .mgr-grid { display: grid; grid-template-columns: minmax(0, 1.85fr) minmax(320px, 1fr); gap: 18px; }
        @media (max-width: 1024px) { .mgr-grid { grid-template-columns: 1fr; } }
      `}</style>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1.2, margin: 0 }}>
          Manager Dashboard
        </h1>
        <div style={{ marginTop: 6, fontSize: 14, color: 'var(--text-secondary)' }}>
          Actionable lab overview, WIP flow, and equipment health.
        </div>
      </div>
      {error && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: '#fde4e4', color: '#c0394a', marginBottom: 16, fontSize: 13, fontWeight: 700 }}>
          Dashboard API error: {error}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard label="To Approve" bucketKey="toApprove" bucket={stats.toApprove} accent="#b8720e" icon={<I.Clock size={17}/>} onClick={() => navigate?.({ page: 'mgr_all_requests', tab: 'submitted' })} />
        <StatCard label="In Progress" bucketKey="inProgress" bucket={stats.inProgress} accent="#2a7a91" icon={<I.Activity size={17}/>} onClick={() => navigate?.({ page: 'lab_wip' })} />
        <StatCard label="Completed" bucketKey="completed" bucket={stats.completed} accent="#157a4a" icon={<I.CircleCheck size={17}/>} onClick={() => navigate?.({ page: 'lab_samples', tab: 'completed' })} />
        <StatCard label="Equipment" bucketKey="equipment" bucket={stats.equipment} accent="#6c67b8" icon={<I.Equipment size={17}/>} onClick={() => navigate?.({ page: 'mgr_equipment' })} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        {[
          { icon: <I.Plus size={18}/>, label: 'New sample request', sub: 'Submit for testing', route: { page: 'lab_sample_new' } },
          { icon: <I.ClipboardList size={18}/>, label: 'Pending approvals', sub: 'Review and approve', route: { page: 'mgr_all_requests', tab: 'submitted' } },
          { icon: <I.Alert size={18}/>, label: 'Equipment alerts', sub: 'Check flagged items', route: { page: 'mgr_equipment', tab: 'alerts' }, badge: alerts },
        ].map((item) => (
          <Card key={item.label} padding={16} onClick={() => navigate?.(item.route as Route)} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, background: '#f4f3fb', color: '#6c67b8', display: 'grid', placeItems: 'center' }}>{item.icon}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{item.label}</span>
              <span style={{ display: 'block', marginTop: 3, fontSize: 12.5, color: 'var(--text-muted)' }}>{item.sub}</span>
            </span>
            {item.badge ? <span style={{ minWidth: 22, height: 22, borderRadius: 999, background: '#fde4e4', color: '#c0394a', fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center' }}>{item.badge}</span> : null}
          </Card>
        ))}
      </div>
      <Card padding={18} style={{ marginBottom: 18, cursor: 'default' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Awaiting Response</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>Requests needing manager review or lab action.</div>
          </div>
          <button onClick={() => navigate?.({ page: 'mgr_all_requests', tab: 'submitted' })} style={{ fontSize: 13, fontWeight: 800, color: '#6c67b8', cursor: 'pointer' }}>Open queue →</button>
        </div>
      </Card>
      <div className="mgr-grid">
        <Card padding={20} style={{ minHeight: 420, cursor: 'default' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Resource Utilization / Productivity Trend</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>Daily dispatches and utilization percentage.</div>
            </div>
            <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} style={{ border: '1px solid rgba(0,0,0,0.10)', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, fontWeight: 700, background: '#fff' }}>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
          <div style={{ display: 'inline-flex', gap: 4, padding: 4, borderRadius: 10, background: '#f1f1f5', marginBottom: 14 }}>
            {(['samples', 'wip', 'equipment'] as Metric[]).map((item) => (
              <button key={item} onClick={() => setMetric(item)} style={{ padding: '7px 12px', borderRadius: 8, background: metric === item ? '#fff' : 'transparent', color: metric === item ? '#1e1e24' : 'var(--text-muted)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', boxShadow: metric === item ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                {item === 'samples' ? 'Samples' : item === 'wip' ? 'WIP' : 'Equipment'}
              </button>
            ))}
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="countFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6c67b8" stopOpacity={0.15}/><stop offset="100%" stopColor="#6c67b8" stopOpacity={0}/></linearGradient>
                  <linearGradient id="utilFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2a7a91" stopOpacity={0.15}/><stop offset="100%" stopColor="#2a7a91" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid stroke="#eef0f4" vertical={false}/>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickMargin={10}/>
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false}/>
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%"/>
                <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                  <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 8, padding: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 12, color: '#6c67b8' }}>Daily count: {payload[0]?.value}</div>
                    <div style={{ fontSize: 12, color: '#2a7a91' }}>Utilization: {payload[1]?.value}%</div>
                    {anomalySet.has(String(label)) && <div style={{ marginTop: 6, fontSize: 11, color: '#c0394a', fontWeight: 800 }}>Spike detected on {label}</div>}
                  </div>
                ) : null}/>
                <Area yAxisId="left" type="monotone" dataKey="dailyCount" stroke="#6c67b8" strokeWidth={2} fill="url(#countFill)" dot={false}/>
                <Area yAxisId="right" type="monotone" dataKey="utilizationPct" stroke="#2a7a91" strokeWidth={2} fill="url(#utilFill)" dot={false}/>
                {chartData.filter((item) => item.anomaly).map((item) => <ReferenceDot key={item.date} yAxisId="left" x={item.date} y={item.dailyCount} r={4} fill="#c0394a" stroke="#fff" strokeWidth={2}/>)}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card padding={20} style={{ minHeight: 420, cursor: 'default' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Recent activity</div>
            <button onClick={() => navigate?.({ page: 'mgr_notifications' })} style={{ fontSize: 12.5, fontWeight: 800, color: '#6c67b8', cursor: 'pointer' }}>View all</button>
          </div>
          {activity.length === 0 ? (
            <div style={{ padding: '48px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No recent activity in the last 24 hours.</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {activity.map((item) => {
                const dot = item.type === 'equipment_alert' ? '#c0394a' : item.type === 'test_completed' ? '#157a4a' : '#b8720e';
                return (
                  <button key={item.id} onClick={() => {
                    if (item.linkTo.includes('equipment')) navigate?.({ page: 'mgr_equipment' });
                    else if (item.linkTo.includes('samples')) navigate?.({ page: 'lab_samples' });
                    else navigate?.({ page: 'mgr_all_requests' });
                  }} style={{ display: 'grid', gridTemplateColumns: '10px 1fr auto', gap: 10, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: dot }}/>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{item.label}</span>
                      <span style={{ display: 'block', marginTop: 3, fontSize: 11.5, color: 'var(--text-muted)' }}>{item.type.replace('_', ' ')}</span>
                    </span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{relativeTime(item.timestamp)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
