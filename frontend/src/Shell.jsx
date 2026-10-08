import React from 'react';
import { C } from './ui.jsx';

const navIcons = {
  overview: '⚡',
  activity: '📊',
  trust: '🛡️',
  users: '👥',
  test: '🧪',
};

export default function Shell({ items, active, onNav, title, subtitle, userButton, children }) {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 0%, #0d1733 0%, #050814 65%)',
      color: C.text,
      fontFamily: "'Outfit', system-ui, -apple-system, sans-serif",
    }}>
      {/* Cyber Glassmorphic Sidebar */}
      <aside style={{
        width: '240px',
        flex: 'none',
        background: 'linear-gradient(180deg, rgba(9, 14, 33, 0.88) 0%, rgba(5, 8, 20, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 20,
      }}>
        {/* Brand Header */}
        <div style={{ padding: '24px 22px 20px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00f2fe, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              boxShadow: '0 0 16px rgba(0, 242, 254, 0.4)',
            }}>
              🛡️
            </div>
            <div>
              <div style={{
                fontWeight: 800,
                fontSize: '1.02rem',
                background: 'linear-gradient(135deg, #ffffff 20%, #00f2fe 65%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '0.02em',
              }}>
                PII Guardrail
              </div>
              <div style={{ color: C.muted, fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>
                Zero-Trust Control
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ padding: '16px 12px', display: 'grid', gap: '6px' }}>
          {items.map(item => {
            const on = item.key === active;
            return (
              <button
                key={item.key}
                onClick={() => onNav(item.key)}
                style={{
                  textAlign: 'left',
                  background: on
                    ? 'linear-gradient(90deg, rgba(0, 242, 254, 0.16) 0%, rgba(168, 85, 247, 0.05) 100%)'
                    : 'transparent',
                  color: on ? '#ffffff' : C.muted,
                  border: 'none',
                  borderLeft: `3px solid ${on ? '#00f2fe' : 'transparent'}`,
                  boxShadow: on ? 'inset 0 0 16px rgba(0, 242, 254, 0.06)' : 'none',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.92rem',
                  fontWeight: on ? 700 : 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.18s ease',
                }}
              >
                <span style={{ fontSize: '1.05rem', filter: on ? 'drop-shadow(0 0 8px rgba(0,242,254,0.5))' : 'none' }}>
                  {navIcons[item.key] || '•'}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom System Status */}
        <div style={{ marginTop: 'auto', padding: '16px 18px', borderTop: `1px solid ${C.border}` }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '8px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.78rem',
            color: '#34d399',
            fontWeight: 600,
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981',
              display: 'inline-block',
            }} />
            Proxy Engine Active
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Sticky Glassmorphic Header */}
        <header style={{
          height: '68px',
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          borderBottom: `1px solid ${C.border}`,
          background: 'rgba(9, 14, 33, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div>
            <div style={{
              fontWeight: 800,
              fontSize: '1.18rem',
              background: 'linear-gradient(135deg, #ffffff 40%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.01em',
            }}>
              {title}
            </div>
            {subtitle && <div style={{ color: C.muted, fontSize: '0.82rem', marginTop: '2px', fontWeight: 500 }}>{subtitle}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {userButton}
          </div>
        </header>

        {/* Main Content */}
        <main style={{
          flex: 1,
          padding: '28px 32px 48px',
          display: 'grid',
          gap: '22px',
          alignContent: 'start',
          maxWidth: '1440px',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
