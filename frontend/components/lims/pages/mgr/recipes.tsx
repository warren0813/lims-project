'use client';

import React, { useMemo, useState } from 'react';
import { useRecipes } from '@/lib/lims/hooks';
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

export function MgrRecipes() {
  const { data: recipes } = useRecipes();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selectedRecipe = useMemo(() => {
    if (recipes.length === 0) return null;
    return recipes.find((recipe: any) => recipe.id === selectedId) || recipes[0];
  }, [recipes, selectedId]);

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
          Test Recipes
        </h1>
        <div style={{ marginTop: 6, fontSize: 14, color: 'var(--text-secondary)' }}>
          Manage standard test recipes and parameters.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        <FabCard padding={0}>
          <div style={{ padding: 24 }}>
            {recipes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                No recipes configured yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {recipes.map((recipe: any) => {
                  const selected = selectedRecipe?.id === recipe.id;
                  return (
                    <button
                      key={recipe.id}
                      type="button"
                      onClick={() => setSelectedId(recipe.id)}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        border: selected ? '2px solid #6c67b8' : '1px solid rgba(0,0,0,0.08)',
                        background: selected ? 'rgba(108,103,184,0.05)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{recipe.name}</div>
                        <Badge status={recipe.active ? 'pass' : 'maintenance'} label={recipe.active ? 'Active' : 'Inactive'} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>
                        {recipe.experimentName || 'Unassigned experiment'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {recipe.description || 'No description'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </FabCard>

        {selectedRecipe && (
          <FabCard style={{ height: 'fit-content', position: 'sticky', top: 20 }}>
            {[
              ['Recipe Name', selectedRecipe.name],
              ['Experiment', selectedRecipe.experimentName || 'Unassigned'],
              ['Description', selectedRecipe.description || 'No description'],
            ].map(([label, value]) => (
              <div key={label} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  {label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {value}
                </div>
              </div>
            ))}

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Parameters
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(selectedRecipe.params || {}).map(([key, value]) => (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: '#f7f8fa',
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>{key}</span>
                    <strong style={{ color: 'var(--text-primary)', textAlign: 'right' }}>{String(value)}</strong>
                  </div>
                ))}
              </div>
            </div>

            <button
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 8,
                background: '#1e1e24',
                color: '#fff',
                fontWeight: 600,
                fontSize: 13,
                border: 'none',
                cursor: 'pointer',
                marginBottom: 8,
              }}
            >
              Edit Recipe
            </button>
            <button
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 8,
                background: '#fff',
                color: '#c0394a',
                fontWeight: 600,
                fontSize: 13,
                border: '1px solid rgba(192,57,74,0.2)',
                cursor: 'pointer',
              }}
            >
              Disable
            </button>
          </FabCard>
        )}
      </div>
    </div>
  );
}
