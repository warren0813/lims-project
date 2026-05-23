'use client';

import React, { useState } from 'react';
import type { Route } from '@/components/lims/shell';
import { api } from '@/lib/lims/api';
import { useExperimentTypes } from '@/lib/lims/hooks';

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

const PrimaryBtn = ({ children, onClick, icon, disabled, style }: any) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '11px 18px',
      borderRadius: 10,
      background: disabled ? '#cbcbd6' : '#1e1e24',
      color: '#fff',
      fontWeight: 600,
      fontSize: 14,
      whiteSpace: 'nowrap',
      transition: 'background 0.12s',
      cursor: disabled ? 'not-allowed' : 'pointer',
      border: 'none',
      ...style,
    }}
    onMouseEnter={(e: any) => {
      if (!disabled) e.currentTarget.style.background = '#2d2d38';
    }}
    onMouseLeave={(e: any) => {
      if (!disabled) e.currentTarget.style.background = '#1e1e24';
    }}
  >
    {icon}
    {children}
  </button>
);

const SectionLabel = ({ children, style }: any) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--text-secondary)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginBottom: 14,
      ...style,
    }}
  >
    {children}
  </div>
);

export function FabNewRequest({ navigate }: { navigate?: (route: Route) => void }) {
  const { data: experimentTypes } = useExperimentTypes()
  const [title, setTitle] = useState('TCT qualification for lot CND-24A');
  const [selectedExperiments, setSelectedExperiments] = useState<string[]>([]);
  const [urgency, setUrgency] = useState('1w');
  const [notes, setNotes] = useState('Run reliability screen on two 8 inch wafers. Please prioritize chamber loading for customer commit.');
  const [sampleName, setSampleName] = useState('Wafer CND-24A-01');
  const [lotId, setLotId] = useState('CND-24A');
  const [waferId, setWaferId] = useState('W01');
  const [materialType, setMaterialType] = useState('Silicon');
  const [busy, setBusy] = useState(false);

  const experiments = experimentTypes.map((item) => ({ id: item.id, name: item.name, group: item.labCategory || 'MA' }));

  const handleExperimentToggle = (id: string) => {
    setSelectedExperiments((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const groupedExperiments = experiments.reduce<Record<string, typeof experiments>>((acc, exp) => {
    acc[exp.group] = [...(acc[exp.group] || []), exp]
    return acc
  }, {});

  const priority = urgency === '3d' ? 'urgent' : urgency === '1w' ? 'high' : 'normal'

  const submit = async (asDraft: boolean) => {
    if (!title || selectedExperiments.length === 0) return
    setBusy(true)
    try {
      const payload = {
        title,
        description: notes,
        priority,
        experiment_type_id: selectedExperiments[0],
        material_type: materialType,
        samples: [{ sample_name: sampleName, lot_id: lotId, wafer_id: waferId, material_type: materialType, quantity: 1 }],
      }
      const req = asDraft ? await api.requests.createDraft(payload) : await api.requests.create(payload)
      navigate?.({ page: 'fab_request', id: req.id })
    } catch (error) {
      alert(`Unable to ${asDraft ? 'save draft' : 'submit request'}: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: '32px 44px 80px', maxWidth: 1400, margin: '0 auto' }}>
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
          Create New Request
        </h1>
        <div style={{ marginTop: 6, fontSize: 14, color: 'var(--text-secondary)' }}>
          Fill in the form below to submit a new test request.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Request Details */}
          <FabCard>
            <SectionLabel>Request Details</SectionLabel>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 13 }}>
                Request Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., TCT 0509001"
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

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 13 }}>
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes or requirements..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid rgba(0,0,0,0.12)',
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  minHeight: 100,
                  resize: 'vertical',
                }}
              />
            </div>
          </FabCard>

          <FabCard>
            <SectionLabel>Sample Information</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                ['Sample name', sampleName, setSampleName],
                ['Lot ID', lotId, setLotId],
                ['Wafer ID', waferId, setWaferId],
                ['Material', materialType, setMaterialType],
              ].map(([label, value, setter]: any) => (
                <label key={label} style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>
                  <span style={{ display: 'block', marginBottom: 8 }}>{label}</span>
                  <input value={value} onChange={(e) => setter(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </label>
              ))}
            </div>
          </FabCard>

          {/* Experiments */}
          <FabCard>
            <SectionLabel>Select Experiments</SectionLabel>
            {Object.entries(groupedExperiments).map(([group, exps]: any) => (
              <div key={group} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  {group === 'RA' ? 'Reliability Analysis' : 'Test & Measurement'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {exps.map((exp: any) => (
                    <label
                      key={exp.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: 10,
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: selectedExperiments.includes(exp.id)
                          ? 'rgba(108,103,184,0.1)'
                          : 'rgba(0,0,0,0.02)',
                        border: selectedExperiments.includes(exp.id)
                          ? '1px solid rgba(108,103,184,0.3)'
                          : '1px solid rgba(0,0,0,0.08)',
                        transition: 'all 0.2s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedExperiments.includes(exp.id)}
                        onChange={() => handleExperimentToggle(exp.id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                        {exp.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </FabCard>
        </div>

        {/* Summary Rail */}
        <div>
          <FabCard style={{ position: 'sticky', top: 20 }}>
            <SectionLabel>Summary</SectionLabel>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
                TITLE
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: title ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                {title || 'Not set'}
              </div>
            </div>

            <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
                EXPERIMENTS
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {selectedExperiments.length}
              </div>
              {selectedExperiments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {selectedExperiments.map((id) => {
                    const exp = experiments.find((e) => e.id === id);
                    return (
                      <div
                        key={id}
                        style={{
                          fontSize: 12,
                          padding: 6,
                          borderRadius: 6,
                          background: 'rgba(108,103,184,0.1)',
                          color: '#6c67b8',
                          fontWeight: 500,
                        }}
                      >
                        {exp?.name}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 13 }}>
                Urgency
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid rgba(0,0,0,0.12)',
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                }}
              >
                <option value="3d">3 Days - Rush</option>
                <option value="1w">1 Week - Standard</option>
                <option value="2w">2 Weeks - Flexible</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <PrimaryBtn
                onClick={() => {
                  submit(false)
                }}
                disabled={busy || !title || selectedExperiments.length === 0}
              >
                Submit Request
              </PrimaryBtn>
              <button
                onClick={() => {
                  submit(true)
                }}
                disabled={busy}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 10,
                  background: '#fff',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: 14,
                  border: '1px solid rgba(0,0,0,0.16)',
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e: any) => {
                  e.currentTarget.style.background = '#f8f8fb';
                }}
                onMouseLeave={(e: any) => {
                  e.currentTarget.style.background = '#fff';
                }}
              >
                Save Draft
              </button>
            </div>
          </FabCard>
        </div>
      </div>
    </div>
  );
}
