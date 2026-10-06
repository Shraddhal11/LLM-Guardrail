import React from 'react';
import { C } from './ui.jsx';

export default function Shell({ items, active, onNav, title, subtitle, userButton, children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif' }}>
      <aside style={{ width: '220px', flex: 'none', background: C.side, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '22px 20px 18px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.01em' }}>PII Governance</div>
          <div style={{ color: C.faint, fontSize: '0.75rem', marginTop: '3px' }}>LLM proxy control plane</div>
        </div>
        <nav style={{ padding: '12px 10px', display: 'grid', gap: '2px' }}>
          {items.map(item => {
            const on = item.key === active;
            return (
              <button
                key={item.key}
                onClick={() => onNav(item.key)}
                style={{
                  textAlign: 'left',
                  background: on ? '#16213a' : 'transparent',
                  color: on ? C.text : C.muted,
                  border: 'none',
                  borderLeft: `2px solid ${on ? C.accent : 'transparent'}`,
                  padding: '9px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: on ? 600 : 500,
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header style={{ height: '64px', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', borderBottom: `1px solid ${C.border}`, background: C.side, position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1.02rem' }}>{title}</div>
            {subtitle && <div style={{ color: C.faint, fontSize: '0.8rem', marginTop: '2px' }}>{subtitle}</div>}
          </div>
          <div>{userButton}</div>
        </header>
        <main style={{ flex: 1, padding: '24px 28px 40px', display: 'grid', gap: '18px', alignContent: 'start' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
