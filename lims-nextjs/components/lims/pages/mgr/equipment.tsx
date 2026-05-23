'use client';

import { useState } from 'react';
import { useEquipment } from '@/lib/lims/hooks';
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

export function MgrEquipment() {
  const { data: equipment } = useEquipment();
  const [filter, setFilter] = useState('all');

  const statuses = ['all', 'idle', 'running', 'maintenance'];
  const filtered = filter === 'all'
    ? equipment
    : equipment.filter((item: any) => item.status === filter);

  const stats = {
    total: equipment.length,
    idle: equipment.filter((item: any) => item.status === 'idle').length,
    running: equipment.filter((item: any) => item.status === 'running').length,
    maintenance: equipment.filter((item: any) => item.status === 'maintenance').length,
  };

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
          Equipment Management
        </h1>
        <div style={{ marginTop: 6, fontSize: 14, color: 'var(--text-secondary)' }}>
          Manage lab equipment, utilization, and maintenance status.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Tools', value: stats.total },
          { label: 'Idle', value: stats.idle },
          { label: 'Running', value: stats.running },
          { label: 'Maintenance', value: stats.maintenance },
        ].map((stat) => (
          <FabCard key={stat.label} padding={16}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{stat.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>{stat.value}</div>
          </FabCard>
        ))}
      </div>

      <div style={{ marginBottom: 20, display: 'flex', gap: 8, overflowX: 'auto' }}>
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
              whiteSpace: 'nowrap',
            }}
          >
            {status.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {filtered.map((item: any) => (
          <FabCard key={item.id} padding={18}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-secondary)' }}>{item.model}</div>
              </div>
              <Badge status={item.status} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
              <span>Capacity</span>
              <strong style={{ color: 'var(--text-primary)' }}>{item.capacity}</strong>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {item.capabilities.map((cap: any) => (
                <span
                  key={cap.id}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: '#f7f8fa',
                    border: '1px solid rgba(0,0,0,0.08)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {cap.name}
                </span>
              ))}
            </div>
          </FabCard>
        ))}
      </div>
    </div>
  );
}
