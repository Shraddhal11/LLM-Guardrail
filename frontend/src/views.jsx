import React, { useEffect, useState } from 'react';
import { C, Card, Kpi, DecisionChip, Empty, Loader, ScrollBox, LimitSelect, RequestTable, RequestDetail, mono } from './ui.jsx';

const inputStyle = { background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '7px 10px', fontSize: '0.88rem' };
const btn = { background: C.accent, color: '#06241f', border: 'none', borderRadius: '6px', padding: '8px 16px', fontWeight: 600, cursor: 'pointer' };
const cellTh = { textAlign: 'left', padding: '9px 10px', color: C.muted, fontSize: '0.78rem', fontWeight: 500, borderBottom: `1px solid ${C.border}` };
const cellTd = { padding: '11px 10px', fontSize: '0.88rem', borderBottom: `1px solid ${C.border}` };

export function Segmented({ value, options, onChange }) {
  return (
    <div style={{ display: 'inline-flex', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '3px' }}>
      {options.map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            background: value === key ? C.border : 'transparent',
            color: value === key ? C.text : C.muted,
            border: 'none',
            borderRadius: '6px',
            padding: '6px 14px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function usePoll(fn, deps, ms = 10000) {
  useEffect(() => {
    let cancelled = false;
    const run = async () => { if (!cancelled) await fn(() => cancelled); };
    run();
    const t = setInterval(run, ms);
    return () => { cancelled = true; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function Bars({ items, color = C.accent, empty = 'No data yet.' }) {
  if (!items || items.length === 0) return <Empty>{empty}</Empty>;
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div style={{ display: 'grid', gap: '10px' }}>
      {items.map(item => (
        <div key={item.label} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 44px', gap: '12px', alignItems: 'center', fontSize: '0.86rem' }}>
          <span style={{ color: '#c9d3e6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
          <div style={{ background: C.border, borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${(item.value / max) * 100}%`, height: '100%', background: color }} />
          </div>
          <span style={{ textAlign: 'right', color: C.text, fontVariantNumeric: 'tabular-nums' }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Logs ----------

export function LogsView({ authedFetch, uuid = null, initialEvent = null, onOpenSession }) {
  const [limit, setLimit] = useState(20);
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [eventId, setEventId] = useState(initialEvent);
  const [search, setSearch] = useState('');
  const [decision, setDecision] = useState('all');
  const [userFilter, setUserFilter] = useState('');
  const [range, setRange] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => setEventId(initialEvent), [initialEvent]);

  usePoll(async (isCancelled) => {
    const url = uuid ? `/api/users/${uuid}/queries?limit=${limit}` : `/api/admin/activity?limit=${limit}`;
    const r = await authedFetch(url);
    if (r.ok && !isCancelled()) {
      setRows(await r.json());
      setLoading(false);
    }
  }, [uuid, limit, authedFetch]);

  usePoll(async (isCancelled) => {
    if (uuid) return;
    const r = await authedFetch('/api/admin/users');
    if (r.ok && !isCancelled()) setUsers(await r.json());
  }, [uuid, authedFetch], 30000);

  if (eventId) {
    return (
      <Card>
        <RequestDetail eventId={eventId} authedFetch={authedFetch} onBack={() => setEventId(null)} />
      </Card>
    );
  }

  const cutoffs = { '1h': 3600e3, '24h': 86400e3, '7d': 7 * 86400e3 };
  const cutoff = cutoffs[range] ? Date.now() - cutoffs[range] : 0;
  const q = search.trim().toLowerCase();
  const shown = rows.filter(r => {
    if (decision === 'violations' && r.decision === 'allow') return false;
    if (decision !== 'all' && decision !== 'violations' && r.decision !== decision) return false;
    if (userFilter && r.user_uuid !== userFilter) return false;
    if (cutoff && (!r.created_at || new Date(r.created_at).getTime() < cutoff)) return false;
    if (q) {
      const hay = [r.original_prompt, r.original_text, (r.categories_found || []).join(' '), r.session_external_id, r.user_email]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <Card
      title={uuid ? 'My logs' : 'All logs'}
      action={<LimitSelect value={limit} onChange={setLimit} />}
    >
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search prompt, category, session or user" style={{ ...inputStyle, flex: '1 1 260px' }} />
        <select value={decision} onChange={e => setDecision(e.target.value)} style={inputStyle}>
          <option value="all">All decisions</option>
          <option value="violations">Violations (redact + block)</option>
          <option value="allow">Allowed</option>
          <option value="redact">Redacted</option>
          <option value="block">Blocked</option>
        </select>
        {!uuid && (
          <select value={userFilter} onChange={e => setUserFilter(e.target.value)} style={inputStyle}>
            <option value="">All users</option>
            {users.map(u => <option key={u.user_uuid} value={u.user_uuid}>{u.email}</option>)}
          </select>
        )}
        <select value={range} onChange={e => setRange(e.target.value)} style={inputStyle}>
          <option value="all">Any time</option>
          <option value="1h">Last hour</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
        </select>
      </div>
      <div style={{ color: C.faint, fontSize: '0.8rem', marginBottom: '10px' }}>
        {loading ? 'Loading requests…' : `Showing ${shown.length} of the latest ${rows.length} requests`}
      </div>
      <ScrollBox maxHeight={600}>
        {loading ? (
          <Loader text="Loading activity logs from database…" />
        ) : (
          <RequestTable
            rows={shown}
            onOpen={setEventId}
            onOpenSession={onOpenSession}
            showUser={!uuid}
            empty="No requests match these filters."
          />
        )}
      </ScrollBox>
    </Card>
  );
}

// ---------- Sessions ----------

export function SessionsView({ authedFetch, uuid = null, showUser = false, initialSession = null }) {
  const [limit, setLimit] = useState(20);
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(initialSession);
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState(null);
  const [search, setSearch] = useState('');
  const [violationsOnly, setViolationsOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setSelected(initialSession); setEventId(null); }, [initialSession]);

  usePoll(async (isCancelled) => {
    const r = await authedFetch(uuid ? `/api/users/${uuid}/sessions` : '/api/admin/sessions');
    if (r.ok && !isCancelled()) {
      setSessions(await r.json());
      setLoading(false);
    }
  }, [uuid, authedFetch]);

  usePoll(async (isCancelled) => {
    if (!selected) return;
    const r = await authedFetch(`/api/sessions/${selected.session_id}/events`);
    if (r.ok && !isCancelled()) setEvents(await r.json());
  }, [selected?.session_id, authedFetch]);

  if (eventId) {
    return (
      <Card>
        <RequestDetail eventId={eventId} authedFetch={authedFetch} onBack={() => setEventId(null)} />
      </Card>
    );
  }

  if (selected) {
    return (
      <Card
        title={
          <span>
            <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', color: C.accent, cursor: 'pointer', padding: 0, fontSize: 'inherit' }}>Sessions</button>
            <span style={{ color: C.faint }}> / </span>
            <span style={{ fontFamily: mono }}>{selected.external_id}</span>
          </span>
        }
      >
        <ScrollBox maxHeight={600}>
          <RequestTable rows={events} onOpen={setEventId} empty="No requests in this session." />
        </ScrollBox>
      </Card>
    );
  }

  const q = search.trim().toLowerCase();
  const filtered = sessions.filter(x => {
    if (violationsOnly && !(x.violations > 0)) return false;
    if (q && !`${x.external_id} ${x.user_email || ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const shown = filtered.slice(0, limit);
  return (
    <Card title={uuid ? 'My sessions' : 'All sessions'} action={<LimitSelect value={limit} onChange={setLimit} />}>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={showUser ? 'Search session or user' : 'Search session'} style={{ ...inputStyle, flex: '1 1 260px' }} />
        <select value={violationsOnly ? 'violations' : 'all'} onChange={e => setViolationsOnly(e.target.value === 'violations')} style={inputStyle}>
          <option value="all">All sessions</option>
          <option value="violations">With violations</option>
        </select>
      </div>
      <div style={{ color: C.faint, fontSize: '0.8rem', marginBottom: '10px' }}>
        {loading ? 'Loading sessions…' : `Showing ${shown.length} of ${filtered.length} sessions`}
      </div>
      {loading ? (
        <Loader text="Loading sessions from database…" />
      ) : sessions.length === 0 ? (
        <Empty>No sessions yet. Send a request through the proxy.</Empty>
      ) : (
        <ScrollBox maxHeight={600}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={cellTh}>Session</th>
                {showUser && <th style={cellTh}>User</th>}
                <th style={{ ...cellTh, textAlign: 'right' }}>Agents</th>
                <th style={{ ...cellTh, textAlign: 'right' }}>Requests</th>
                <th style={{ ...cellTh, textAlign: 'right' }}>Violations</th>
                <th style={cellTh}>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(s => (
                <tr
                  key={s.session_id}
                  onClick={() => setSelected({ session_id: s.session_id, external_id: s.external_id })}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#16213a')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ ...cellTd, fontFamily: mono, color: C.accent }}>{s.external_id}</td>
                  {showUser && <td style={cellTd}>{s.user_email}</td>}
                  <td style={{ ...cellTd, textAlign: 'right' }}>{s.agents}</td>
                  <td style={{ ...cellTd, textAlign: 'right' }}>{s.requests}</td>
                  <td style={{ ...cellTd, textAlign: 'right', color: s.violations > 0 ? C.block : C.muted }}>{s.violations}</td>
                  <td style={{ ...cellTd, color: C.muted, whiteSpace: 'nowrap' }}>{s.last_seen_at ? new Date(s.last_seen_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollBox>
      )}
    </Card>
  );
}

// ---------- Users (admin) ----------

export function UsersView({ authedFetch, onOpenUser }) {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('violations');
  const [shown, setShown] = useState(10);

  usePoll(async (isCancelled) => {
    const r = await authedFetch('/api/admin/users');
    if (r.ok && !isCancelled()) setUsers(await r.json());
  }, [authedFetch], 15000);

  const q = query.trim().toLowerCase();
  let list = users.filter(u => (!q || u.email.toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q)));
  if (filter === 'violations') list = list.filter(u => u.violations > 0);
  if (filter === 'admins') list = list.filter(u => u.role === 'admin');
  const sorters = {
    violations: (a, b) => b.violations - a.violations,
    requests: (a, b) => b.requests - a.requests,
    last_active: (a, b) => (b.last_active || '').localeCompare(a.last_active || ''),
  };
  list = [...list].sort(sorters[sort]);

  return (
    <Card
      title={`Users (${list.length})`}
      action={
        <div style={{ display: 'flex', gap: '10px' }}>
          <input value={query} onChange={e => { setQuery(e.target.value); setShown(10); }} placeholder="Search name or email" style={{ ...inputStyle, width: '240px' }} />
          <select value={filter} onChange={e => { setFilter(e.target.value); setShown(10); }} style={inputStyle}>
            <option value="all">All users</option>
            <option value="violations">With violations</option>
            <option value="admins">Admins</option>
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)} style={inputStyle}>
            <option value="violations">Sort: violations</option>
            <option value="requests">Sort: requests</option>
            <option value="last_active">Sort: last active</option>
          </select>
        </div>
      }
    >
      {list.length === 0 ? <Empty>No users match.</Empty> : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={cellTh}>Email</th>
                <th style={cellTh}>Role</th>
                <th style={{ ...cellTh, textAlign: 'right' }}>Requests</th>
                <th style={{ ...cellTh, textAlign: 'right' }}>Violations</th>
                <th style={{ ...cellTh, textAlign: 'right' }}>PII</th>
                <th style={cellTh}>Top category</th>
                <th style={cellTh}>Last active</th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, shown).map(u => (
                <tr
                  key={u.user_uuid}
                  onClick={() => onOpenUser(u)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#16213a')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={cellTd}>{u.email}</td>
                  <td style={{ ...cellTd, color: u.role === 'admin' ? C.redact : C.muted }}>{u.role}</td>
                  <td style={{ ...cellTd, textAlign: 'right' }}>{u.requests}</td>
                  <td style={{ ...cellTd, textAlign: 'right', color: u.violations > 0 ? C.block : C.muted }}>{u.violations}</td>
                  <td style={{ ...cellTd, textAlign: 'right' }}>{u.pii_detected}</td>
                  <td style={cellTd}>{u.top_category || '—'}</td>
                  <td style={{ ...cellTd, color: C.muted, whiteSpace: 'nowrap' }}>{u.last_active ? new Date(u.last_active).toLocaleString() : 'never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length > shown && (
            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <button onClick={() => setShown(shown + 10)} style={{ ...btn, background: 'transparent', color: C.accent, border: `1px solid ${C.border}` }}>
                Show 10 more ({list.length - shown} left)
              </button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ---------- One user (admin) ----------

export function UserView({ authedFetch, user, onOpenEvent }) {
  const [stats, setStats] = useState(null);
  const [tokens, setTokens] = useState(null);

  usePoll(async (isCancelled) => {
    const [s, t] = await Promise.all([
      authedFetch(`/api/stats?user_uuid=${user.user_uuid}`),
      authedFetch(`/api/users/${user.user_uuid}/tokens`),
    ]);
    if (isCancelled()) return;
    if (s.ok) setStats(await s.json());
    if (t.ok) setTokens(await t.json());
  }, [user.user_uuid, authedFetch]);

  const d = stats?.decision_counts || {};
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
        <Kpi label="Requests" value={stats?.total_requests ?? 0} />
        <Kpi label="Violations" value={(d.redact || 0) + (d.block || 0)} hint={`${d.redact || 0} redacted · ${d.block || 0} blocked`} />
        <Kpi label="PII found" value={stats?.total_pii_detected ?? 0} />
        <Kpi label="Tokens" value={(tokens?.total_tokens ?? 0).toLocaleString()} />
        <Kpi label="Average tokens per session" value={Math.round(tokens?.average_tokens_per_session ?? 0).toLocaleString()} />
        <Kpi label="Average latency" value={`${Math.round(stats?.avg_latency_ms ?? 0)} ms`} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '18px' }}>
        <Card title="Sessions"><SessionsView authedFetch={authedFetch} uuid={user.user_uuid} /></Card>
        <Card title="Categories found"><Bars items={Object.entries(stats?.category_counts || {}).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)} empty="No PII found for this user." /></Card>
      </div>
      <LogsView authedFetch={authedFetch} uuid={user.user_uuid} onOpenSession={null} />
    </>
  );
}

// ---------- Overview (user) ----------

export function OverviewUser({ authedFetch, me, onOpenEvent }) {
  const uuid = me.user_uuid;
  const [mode, setMode] = useState(me.action_mode || '');
  const [saved, setSaved] = useState('');
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [violations, setViolations] = useState([]);

  useEffect(() => {
    const syncMode = async () => {
      const r = await authedFetch('/api/me');
      if (r.ok) {
        const data = await r.json();
        setMode(data.action_mode || '');
      }
    };
    syncMode();
  }, [authedFetch]);
  // Vite's dev server (5173) only proxies API calls for browsing the dashboard itself;
  // the real backend a chat client connects to is always on 8000 in local dev.
  // Everywhere else (Vercel, or the built dashboard served by the backend directly),
  // the page's own origin is the backend.
  const proxyBase = window.location.port === '5173' ? 'http://localhost:8000' : window.location.origin;
  const proxyUrl = `${proxyBase}/proxy/${uuid}/v1`;

  usePoll(async (isCancelled) => {
    const [s, t, q] = await Promise.all([
      authedFetch(`/api/stats?user_uuid=${uuid}`),
      authedFetch(`/api/users/${uuid}/tokens`),
      authedFetch(`/api/users/${uuid}/queries?limit=50`),
    ]);
    if (isCancelled()) return;
    if (s.ok) setStats(await s.json());
    if (t.ok) setTokens(await t.json());
    if (q.ok) setViolations((await q.json()).filter(r => r.decision !== 'allow').slice(0, 8));
  }, [uuid, authedFetch]);

  const saveMode = async (value) => {
    setMode(value);
    const res = await authedFetch(`/api/users/${uuid}/action-mode`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: value || null }),
    });
    setSaved(res.ok ? 'Saved' : `Could not save (HTTP ${res.status})`);
    setTimeout(() => setSaved(''), 2000);
  };

  const d = stats?.decision_counts || {};
  const modes = [
    ['', 'Global default'],
    ['REDACT', 'Redact: static [REDACTED] replacement'],
    ['BLOCK', 'Block: reject prompt with HTTP 400'],
    ['HASH', 'Hash: SHA-256 hash replacement'],
    ['LOG_ONLY', 'Log only: send as-is, record in audit log'],
  ];

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
        <Kpi label="Requests" value={stats?.total_requests ?? 0} hint={`${d.allow || 0} allowed`} />
        <Kpi label="Violations" value={(d.redact || 0) + (d.block || 0)} hint={`${d.redact || 0} redacted · ${d.block || 0} blocked`} />
        <Kpi label="PII found" value={stats?.total_pii_detected ?? 0} />
        <Kpi label="Tokens, latest session" value={(tokens?.latest_session?.total_tokens ?? 0).toLocaleString()} hint={tokens?.latest_session ? `${tokens.latest_session.prompt_tokens} in · ${tokens.latest_session.completion_tokens} out` : undefined} />
        <Kpi label="Average tokens per session" value={Math.round(tokens?.average_tokens_per_session ?? 0).toLocaleString()} hint={`${tokens?.average_tokens_per_request ?? 0} per request`} />
        <Kpi label="Average latency" value={`${Math.round(stats?.avg_latency_ms ?? 0)} ms`} hint="per request" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)', gap: '18px', alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: '18px' }}>
          <Card title="Your proxy link" action={<button onClick={() => { navigator.clipboard.writeText(proxyUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={btn}>{copied ? 'Copied' : 'Copy'}</button>}>
            <div style={{ fontFamily: mono, color: C.accent, fontSize: '0.92rem', wordBreak: 'break-all' }}>{proxyUrl}</div>
            <div style={{ color: C.faint, fontSize: '0.82rem', marginTop: '10px' }}>Use this in Cline, Open WebUI or LangChain as the OpenAI base URL.</div>
          </Card>
          <Card title="How PII is handled for you">
            <select value={mode} onChange={e => saveMode(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
              {modes.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
            </select>
            <div style={{ color: C.allow, fontSize: '0.82rem', marginTop: '8px', minHeight: '1em' }}>{saved}</div>
            <div style={{ color: C.faint, fontSize: '0.82rem', marginTop: '6px' }}>Applies to your next request. A request can still override it with the X-Action-Mode header, if it sends one.</div>
          </Card>
        </div>

        <Card title="What happened" action={<span style={{ color: C.faint, fontSize: '0.82rem' }}>latest violations</span>}>
          {violations.length === 0 ? <Empty>No violations. Nothing was redacted or blocked.</Empty> : (
            <div style={{ display: 'grid', gap: '2px' }}>
              {violations.map(v => (
                <button
                  key={v.id}
                  onClick={() => onOpenEvent(v.id)}
                  style={{ display: 'grid', gridTemplateColumns: '150px 84px 1fr', gap: '12px', alignItems: 'center', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: `1px solid ${C.border}`, padding: '11px 6px', cursor: 'pointer', color: C.text }}
                >
                  <span style={{ color: C.muted, fontSize: '0.82rem' }}>{v.created_at ? new Date(v.created_at).toLocaleString() : ''}</span>
                  <DecisionChip decision={v.decision} />
                  <span style={{ fontSize: '0.88rem' }}>
                    {v.decision === 'block' ? 'Blocked, not sent' : 'Redacted'}: {(v.categories_found || []).join(', ') || 'PII'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

// ---------- Overview (admin) ----------

export function OverviewAdmin({ authedFetch, onOpenEvent, onOpenUser }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [attention, setAttention] = useState([]);
  const [sessionCount, setSessionCount] = useState(0);

  usePoll(async (isCancelled) => {
    const [s, u, a, ss] = await Promise.all([
      authedFetch('/api/stats'),
      authedFetch('/api/admin/users'),
      authedFetch('/api/admin/activity?limit=8&violations_only=true'),
      authedFetch('/api/admin/sessions'),
    ]);
    if (isCancelled()) return;
    if (s.ok) setStats(await s.json());
    if (u.ok) setUsers(await u.json());
    if (a.ok) setAttention(await a.json());
    if (ss.ok) setSessionCount((await ss.json()).length);
  }, [authedFetch]);

  const d = stats?.decision_counts || {};
  const avgTokensPerSession = sessionCount ? Math.round((stats?.total_tokens || 0) / sessionCount) : 0;
  const activeCutoff = Date.now() - 24 * 3600 * 1000;
  const activeUsers = users.filter(u => u.last_active && new Date(u.last_active).getTime() >= activeCutoff).length;
  const topUsers = [...users].filter(u => u.violations > 0).sort((a, b) => b.violations - a.violations).slice(0, 5);
  const categories = Object.entries(stats?.category_counts || {}).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
        <Kpi label="Requests" value={stats?.total_requests ?? 0} hint={`${d.allow || 0} allowed`} />
        <Kpi label="Violations" value={(d.redact || 0) + (d.block || 0)} hint={`${d.redact || 0} redacted · ${d.block || 0} blocked`} />
        <Kpi label="PII found" value={stats?.total_pii_detected ?? 0} />
        <Kpi label="Total tokens" value={(stats?.total_tokens ?? 0).toLocaleString()} hint={`${avgTokensPerSession.toLocaleString()} per session on average`} />
        <Kpi label="Average latency" value={`${Math.round(stats?.avg_latency_ms ?? 0)} ms`} hint="across all requests" />
        <Kpi label="Active users, 24h" value={activeUsers} hint={`${users.length} users in total`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '18px', alignItems: 'start' }}>
        <Card title="Needs attention" action={<span style={{ color: C.faint, fontSize: '0.82rem' }}>latest violations, all users</span>}>
          {attention.length === 0 ? <Empty>No violations yet.</Empty> : (
            <div style={{ display: 'grid', gap: '2px' }}>
              {attention.map(v => (
                <button
                  key={v.event_id}
                  onClick={() => onOpenEvent(v.event_id)}
                  style={{ display: 'grid', gridTemplateColumns: '150px 1fr 84px', gap: '12px', alignItems: 'center', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: `1px solid ${C.border}`, padding: '11px 6px', cursor: 'pointer', color: C.text }}
                >
                  <span style={{ color: C.muted, fontSize: '0.82rem' }}>{v.created_at ? new Date(v.created_at).toLocaleString() : ''}</span>
                  <span style={{ fontSize: '0.88rem' }}>
                    <span style={{ color: C.text }}>{v.user_email}</span>
                    <span style={{ color: C.muted }}> · {(v.categories_found || []).join(', ') || 'PII'}</span>
                  </span>
                  <DecisionChip decision={v.decision} />
                </button>
              ))}
            </div>
          )}
        </Card>

        <div style={{ display: 'grid', gap: '18px' }}>
          <Card title="Top users by violations">
            {topUsers.length === 0 ? <Empty>No users with violations.</Empty> : (
              <div style={{ display: 'grid', gap: '2px' }}>
                {topUsers.map(u => (
                  <button
                    key={u.user_uuid}
                    onClick={() => onOpenUser(u)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: `1px solid ${C.border}`, padding: '10px 6px', cursor: 'pointer', color: C.text, fontSize: '0.88rem' }}
                  >
                    <span>{u.email}</span>
                    <span style={{ color: C.block, fontVariantNumeric: 'tabular-nums' }}>{u.violations}</span>
                  </button>
                ))}
              </div>
            )}
          </Card>
          <Card title="PII categories found">
            <Bars items={categories} empty="No PII found yet." />
          </Card>
        </div>
      </div>
    </>
  );
}

// ---------- Test ----------

export function TestView({ authedFetch }) {
  const [prompt, setPrompt] = useState('Patient Saurabh Shisode (DOB: 04/12/1985), email saurabh@example.com, phone 555-123-4567, id 512592');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const r = await authedFetch('/api/test-inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, mode: 'REDACT' }),
      });
      setResult(await r.json());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px', alignItems: 'start' }}>
      <Card title="Prompt">
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} style={{ ...inputStyle, width: '100%', height: '180px', boxSizing: 'border-box', fontFamily: mono, resize: 'vertical' }} />
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: C.faint, fontSize: '0.82rem' }}>Checked the same way as a live request. Saved to your activity.</span>
          <button onClick={run} disabled={busy} style={btn}>{busy ? 'Checking…' : 'Check prompt'}</button>
        </div>
      </Card>
      <Card title="Result">
        {!result ? <Empty>Run a check to see what would be found and what the model would receive.</Empty> : (
          <>
            <div style={{ fontFamily: mono, color: C.allow, whiteSpace: 'pre-wrap', fontSize: '0.92rem', lineHeight: 1.6, background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '14px', minHeight: '90px' }}>
              {result.anonymized_prompt || result.detail || 'No output'}
            </div>
            <div style={{ marginTop: '16px', color: C.muted, fontSize: '0.82rem', marginBottom: '8px' }}>{(result.matches || []).length} item(s) found</div>
            {(result.matches || []).length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={cellTh}>Type</th><th style={cellTh}>Category</th><th style={cellTh}>Found text</th></tr></thead>
                <tbody>
                  {result.matches.map((m, i) => (
                    <tr key={i}>
                      <td style={cellTd}>{m.entity_type}</td>
                      <td style={cellTd}>{m.category_name}</td>
                      <td style={{ ...cellTd, fontFamily: mono }}>{m.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
