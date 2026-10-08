import React, { useEffect, useState } from 'react';

export const C = {
  bg: '#0b1020',
  side: '#0e1528',
  surface: '#121a2e',
  border: '#1e2a44',
  text: '#e6ebf5',
  muted: '#8a97b1',
  faint: '#5b6785',
  accent: '#5eead4',
  allow: '#34d399',
  redact: '#fbbf24',
  block: '#f87171',
};

export const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';

export function Card({ title, action, children, style }) {
  return (
    <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '18px 20px', minWidth: 0, ...style }}>
      {(title || action) && (
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: C.text }}>{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Kpi({ label, value, hint }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px 18px' }}>
      <div style={{ color: C.muted, fontSize: '0.78rem', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '1.65rem', fontWeight: 600, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {hint && <div style={{ color: C.faint, fontSize: '0.8rem', marginTop: '6px' }}>{hint}</div>}
    </div>
  );
}

export function DecisionChip({ decision }) {
  const color = { allow: C.allow, redact: C.redact, block: C.block, deny: C.block }[decision] || C.muted;
  return (
    <span style={{ color, border: `1px solid ${color}55`, padding: '2px 9px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600 }}>
      {decision}
    </span>
  );
}

export function Empty({ children }) {
  return <div style={{ color: C.faint, padding: '20px', textAlign: 'center', fontSize: '0.9rem' }}>{children}</div>;
}

export function Loader({ text = 'Loading data…' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '30px', color: C.muted, fontSize: '0.9rem' }}>
      <div style={{
        width: '16px',
        height: '16px',
        border: `2px solid ${C.border}`,
        borderTop: `2px solid ${C.accent}`,
        borderRadius: '50%',
        animation: 'ui-spin 0.8s linear infinite'
      }} />
      <span>{text}</span>
      <style>{`@keyframes ui-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function Loader3D({ title = 'Initializing Governance Engine...', subtitle = 'Syncing session state' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'radial-gradient(circle at center, #0f172a 0%, #060913 75%)', textAlign: 'center', padding: '20px', fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <div style={{ position: 'relative', width: '120px', height: '120px', perspective: '1000px', transformStyle: 'preserve-3d', marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', width: '100px', height: '100px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,242,254,0.3) 0%, rgba(168,85,247,0.15) 50%, transparent 70%)', filter: 'blur(12px)' }} />
        <div style={{ position: 'absolute', width: '110px', height: '110px', borderRadius: '50%', border: '3px solid transparent', borderTop: '3px solid #00f2fe', borderBottom: '3px solid #00f2fe', boxShadow: '0 0 22px rgba(0, 242, 254, 0.45)', animation: 'spin3dX 3.5s linear infinite' }} />
        <div style={{ position: 'absolute', width: '85px', height: '85px', borderRadius: '50%', border: '3px solid transparent', borderLeft: '3px solid #a855f7', borderRight: '3px solid #a855f7', boxShadow: '0 0 20px rgba(168, 85, 247, 0.45)', animation: 'spin3dY 2.8s linear infinite' }} />
        <div style={{ position: 'absolute', width: '60px', height: '60px', borderRadius: '50%', border: '2.5px solid transparent', borderTop: '2.5px solid #38bdf8', borderRight: '2.5px solid #38bdf8', animation: 'spin3dX 2s linear infinite reverse' }} />
        <div style={{ position: 'absolute', width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg, #00f2fe, #a855f7)', animation: 'pulseCore 2.2s ease-in-out infinite' }} />
      </div>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', fontWeight: 700, background: 'linear-gradient(135deg, #ffffff 20%, #38bdf8 65%, #a855f7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '0.02em' }}>
        {title}
      </h3>
      <p style={{ margin: 0, fontSize: '0.88rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#00f2fe', boxShadow: '0 0 10px #00f2fe', animation: 'pulseDot 1.5s ease-in-out infinite' }} />
        {subtitle}
      </p>
    </div>
  );
}

export function ScrollBox({ children, maxHeight = 480 }) {
  return <div style={{ maxHeight, overflow: 'auto' }}>{children}</div>;
}

export function LimitSelect({ value, onChange, options = [10, 20, 30, 50, 100] }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: C.muted, fontSize: '0.85rem' }}>
      Show
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '4px 8px' }}
      >
        {options.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    </label>
  );
}

const th = { textAlign: 'left', padding: '9px 10px', color: C.muted, fontSize: '0.78rem', fontWeight: 500, position: 'sticky', top: 0, background: C.surface, borderBottom: `1px solid ${C.border}` };
const td = { padding: '11px 10px', fontSize: '0.88rem', borderBottom: `1px solid ${C.border}`, verticalAlign: 'top' };

function Preview({ text }) {
  return (
    <span style={{ display: 'inline-block', maxWidth: '420px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle', fontFamily: mono, color: '#c9d3e6', fontSize: '0.85rem' }}>
      {text || '—'}
    </span>
  );
}

// One table for every list of requests (logs, session requests, recent activity).
export function RequestTable({ rows, onOpen, onOpenSession, showUser = false, empty = 'No requests yet.' }) {
  if (!rows || rows.length === 0) return <Empty>{empty}</Empty>;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={th}>Time</th>
          {showUser && <th style={th}>User</th>}
          {onOpenSession && <th style={th}>Session</th>}
          <th style={th}>Decision</th>
          <th style={th}>Categories</th>
          <th style={th}>Prompt</th>
          <th style={{ ...th, textAlign: 'right' }}>Tokens</th>
          <th style={{ ...th, textAlign: 'right' }}>Latency</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => {
          const id = r.event_id || r.id;
          return (
            <tr
              key={id}
              onClick={() => onOpen(id)}
              style={{ cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#16213a')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <td style={{ ...td, whiteSpace: 'nowrap', color: C.muted }}>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
              {showUser && <td style={td}>{r.user_email || '—'}</td>}
              {onOpenSession && (
                <td style={td}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenSession(r.session_id, r.session_external_id); }}
                    style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.accent, borderRadius: '6px', padding: '2px 8px', cursor: 'pointer', fontFamily: mono, fontSize: '0.78rem' }}
                  >
                    {r.session_external_id || (r.session_id || '').slice(0, 8)}
                  </button>
                </td>
              )}
              <td style={td}><DecisionChip decision={r.decision} /></td>
              <td style={{ ...td, color: '#c9d3e6' }}>{(r.categories_found || []).join(', ') || '—'}</td>
              <td style={td}><Preview text={r.original_prompt || r.original_text} /></td>
              <td style={{ ...td, textAlign: 'right', color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
                {r.prompt_tokens != null || r.completion_tokens != null ? (r.prompt_tokens || 0) + (r.completion_tokens || 0) : '—'}
              </td>
              <td style={{ ...td, textAlign: 'right', color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{r.latency_ms != null ? `${Math.round(r.latency_ms)} ms` : '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function RequestDetail({ eventId, authedFetch, onBack }) {
  const [e, setE] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    authedFetch(`/api/events/${eventId}`)
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (!cancelled) setE(data);
      })
      .catch(err => !cancelled && setError(`Could not load this request (${err.message})`));
    return () => { cancelled = true; };
  }, [eventId, authedFetch]);

  if (error) return <Empty>{error}</Empty>;
  if (!e) return <Empty>Loading…</Empty>;

  const box = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '14px', minHeight: '96px', whiteSpace: 'pre-wrap', fontFamily: mono, fontSize: '0.88rem', lineHeight: 1.55, color: '#c9d3e6' };
  const label = { color: C.muted, fontSize: '0.78rem', marginBottom: '8px' };
  const kv = { display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: '8px', fontSize: '0.88rem' };

  return (
    <div>
      {onBack && (
        <button onClick={onBack} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginBottom: '18px' }}>← Back</button>
      )}
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
        <DecisionChip decision={e.decision} />
        <span style={{ color: C.muted, fontSize: '0.88rem' }}>{e.created_at ? new Date(e.created_at).toLocaleString() : ''}</span>
      </div>
      {e.reason && <div style={{ color: C.text, marginBottom: '20px', fontSize: '0.95rem' }}>{e.reason}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px', marginBottom: '22px' }}>
        <div>
          <div style={label}>Before (as sent)</div>
          <div style={box}>{e.original_text || <span style={{ color: C.faint }}>not stored</span>}</div>
        </div>
        <div>
          <div style={label}>After (sent to model)</div>
          <div style={{ ...box, color: C.allow }}>
            {e.decision === 'block'
              ? <span style={{ color: C.block }}>Not sent. The request was blocked.</span>
              : (e.anonymized_text || e.original_text || <span style={{ color: C.faint }}>no change</span>)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
        <div>
          <div style={label}>What was found</div>
          {e.findings.length === 0 ? <Empty>Nothing found.</Empty> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Type</th><th style={th}>Category</th><th style={th}>Replaced with</th></tr></thead>
              <tbody>
                {e.findings.map((f, i) => (
                  <tr key={i}>
                    <td style={td}>{f.entity_type}</td>
                    <td style={td}>{f.category}</td>
                    <td style={{ ...td, fontFamily: mono, color: C.allow }}>{f.placeholder || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div>
          <div style={label}>Details</div>
          <div style={kv}>
            <span style={{ color: C.muted }}>Session</span><span>{e.session_external_id || '—'}</span>
            <span style={{ color: C.muted }}>Agent</span><span>{e.agent_name || 'default'}</span>
            <span style={{ color: C.muted }}>Model</span><span>{e.model || '—'}</span>
            <span style={{ color: C.muted }}>Handling</span><span>{e.action_mode || '—'}</span>
            <span style={{ color: C.muted }}>Prompt tokens</span><span>{e.prompt_tokens ?? '—'}</span>
            <span style={{ color: C.muted }}>Completion tokens</span><span>{e.completion_tokens ?? '—'}{e.tokens_estimated ? ' (estimated)' : ''}</span>
            <span style={{ color: C.muted }}>Latency</span><span>{e.latency_ms} ms</span>
          </div>
        </div>
      </div>
    </div>
  );
}
