'use client';

import React, { useMemo } from 'react';
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

interface FabDraftsProps { navigate?: (route: Route) => void }

export function FabDrafts({ navigate }: FabDraftsProps) {
  const { data: requests } = useRequests();

  const drafts = useMemo(() => {
    return requests.filter((r: any) => r.status === 'draft');
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
          Drafts
        </h1>
        <div style={{ marginTop: 6, fontSize: 14, color: 'var(--text-secondary)' }}>
          Continue working on your saved drafts.
        </div>
      </div>

      <FabCard padding={0}>
        <div style={{ padding: 24 }}>
          {drafts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
              No drafts yet. Start creating a new request to save as a draft.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {drafts.map((draft: any) => (
                <button
                  type="button"
                  key={draft.id}
                  onClick={() => navigate?.({ page: 'fab_draft_edit', id: draft.id })}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    border: '1px solid rgba(0,0,0,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    width: '100%',
                    background: '#fff',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e: any) => {
                    e.currentTarget.style.borderColor = 'rgba(108,103,184,0.3)';
                    e.currentTarget.style.background = 'rgba(108,103,184,0.02)';
                  }}
                  onMouseLeave={(e: any) => {
                    e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {draft.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Last edited {draft.created}
                    </div>
                  </div>
                  <Badge status={draft.status} />
                </button>
              ))}
            </div>
          )}
        </div>
      </FabCard>
    </div>
  );
}
