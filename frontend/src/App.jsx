import React, { useState, useEffect, useCallback } from 'react';
import { ClerkProvider, SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth, useUser } from '@clerk/clerk-react';
import Shell from './Shell.jsx';
import { OverviewAdmin, OverviewUser, LogsView, SessionsView, UsersView, UserView, TestView, Segmented } from './views.jsx';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "pk_test_ZHJpdmVuLWNsYW0tOTMwNi5jbGVyay5hY2NvdW50cy5kZXYk";

function LandingPage() {
  return (
    <div style={{ background: '#060913', minHeight: '100vh', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto', padding: '20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #00f2fe, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
            🛡️
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0, background: 'linear-gradient(to right, #fff, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              PII Governance Platform
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>HIPAA Safe Harbor & DPDP Execution Engine</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <SignInButton mode="modal">
            <button style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button style={{ background: 'linear-gradient(135deg, #00f2fe, #7f00ff)', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              Get Started / Sign Up
            </button>
          </SignUpButton>
        </div>
      </header>

      <section style={{ maxWidth: '900px', margin: '60px auto 40px auto', textAlign: 'center', padding: '0 20px' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: '800', lineHeight: 1.15, marginBottom: '20px', background: 'linear-gradient(to right, #ffffff, #93c5fd, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          HIPAA & DPDP Compliance Execution Engine for AI Agents
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#94a3b8', maxWidth: '750px', margin: '0 auto 30px auto', lineHeight: 1.6 }}>
          Intercept, anonymize, and audit LLM prompts in real-time before sensitive data reaches external GPU nodes.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
          <SignUpButton mode="modal">
            <button style={{ background: 'linear-gradient(135deg, #00f2fe, #7f00ff)', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '10px', fontSize: '1.05rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,242,254,0.3)' }}>
              Sign Up & Get Your Proxy Link
            </button>
          </SignUpButton>
          <SignInButton mode="modal">
            <button style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '14px 24px', borderRadius: '10px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}>
              Sign In
            </button>
          </SignInButton>
        </div>
      </section>
    </div>
  );
}

function Dashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [me, setMe] = useState(undefined);
  const [nav, setNav] = useState({ page: 'overview', params: {} });

  const authedFetch = useCallback(async (url, options = {}) => {
    const token = await getToken();
    return fetch(url, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` } });
  }, [getToken]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        await authedFetch('/api/users/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clerk_user_id: user.id,
            email: user.primaryEmailAddress?.emailAddress || '',
            name: user.fullName || 'User',
          }),
        });
        const res = await authedFetch('/api/me');
        setMe(res.ok ? await res.json() : null);
      } catch (e) {
        setMe(null);
      }
    };
    load();
  }, [user, authedFetch]);

  const go = (page, params = {}) => setNav({ page, params });

  if (me === undefined) {
    return <div style={{ color: '#8a97b1', padding: '40px', fontFamily: 'system-ui, sans-serif', background: '#0b1020', minHeight: '100vh' }}>Loading…</div>;
  }
  if (me === null) {
    return <div style={{ color: '#f87171', padding: '40px', fontFamily: 'system-ui, sans-serif', background: '#0b1020', minHeight: '100vh' }}>Could not load your account. Refresh to try again.</div>;
  }

  const isAdmin = me.role === 'admin';
  const items = isAdmin
    ? [
        { key: 'overview', label: 'Overview' },
        { key: 'activity', label: 'Activity' },
        { key: 'users', label: 'Users' },
        { key: 'test', label: 'Test' },
      ]
    : [
        { key: 'overview', label: 'Overview' },
        { key: 'activity', label: 'Activity' },
        { key: 'test', label: 'Test' },
      ];

  const scope = nav.params.scope || 'all';
  const view = nav.params.view || 'requests';
  const showMe = !isAdmin || scope === 'me';

  const titles = {
    overview: 'Overview',
    activity: view === 'sessions' ? (isAdmin && !showMe ? 'All sessions' : 'Sessions') : (isAdmin && !showMe ? 'All requests' : 'Requests'),
    users: 'Users',
    user: nav.params.user?.email || 'User',
    test: 'Test a prompt',
  };
  const subtitles = {
    overview: isAdmin && !showMe ? 'System-wide activity' : 'Your activity and how PII is handled',
    activity: view === 'sessions' ? 'Tasks and conversations, then their requests' : 'Every request, with its decision and details',
    users: 'Search and open a user',
    user: 'Sessions, logs and categories for this user',
    test: 'Check a prompt without sending it to the model',
  };

  const openEvent = id => go('activity', { view: 'requests', event: id });
  const openSession = (id, name) => go('activity', { view: 'sessions', session: { session_id: id, external_id: name || id } });

  let header = null;
  let content;
  if (nav.page === 'overview') {
    if (isAdmin) {
      header = <Segmented value={scope} onChange={v => go('overview', { scope: v })} options={[['all', 'All users'], ['me', 'Me']]} />;
    }
    content = showMe
      ? <OverviewUser authedFetch={authedFetch} me={me} onOpenEvent={openEvent} />
      : <OverviewAdmin authedFetch={authedFetch} onOpenEvent={openEvent} onOpenUser={u => go('user', { user: u })} />;
  } else if (nav.page === 'activity') {
    const uuid = showMe ? me.user_uuid : null;
    header = <Segmented value={view} onChange={v => go('activity', { view: v, scope: nav.params.scope })} options={[['requests', 'Requests'], ['sessions', 'Sessions']]} />;
    content = view === 'sessions'
      ? <SessionsView authedFetch={authedFetch} uuid={uuid} showUser={!showMe} initialSession={nav.params.session || null} />
      : <LogsView authedFetch={authedFetch} uuid={uuid} initialEvent={nav.params.event || null} onOpenSession={openSession} />;
  } else if (nav.page === 'users' && isAdmin) {
    content = <UsersView authedFetch={authedFetch} onOpenUser={u => go('user', { user: u })} />;
  } else if (nav.page === 'user' && isAdmin && nav.params.user) {
    content = <UserView authedFetch={authedFetch} user={nav.params.user} />;
  } else if (nav.page === 'test') {
    content = <TestView authedFetch={authedFetch} />;
  } else {
    content = <OverviewUser authedFetch={authedFetch} me={me} onOpenEvent={openEvent} />;
  }

  const activeKey = nav.page === 'user' ? 'users' : nav.page;
  return (
    <Shell
      items={items}
      active={activeKey}
      onNav={key => go(key)}
      title={titles[nav.page] || titles.overview}
      subtitle={subtitles[nav.page] || subtitles.overview}
      userButton={<UserButton showName />}
    >
      {header}
      {content}
    </Shell>
  );
}

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <SignedOut>
        <LandingPage />
      </SignedOut>
      <SignedIn>
        <Dashboard />
      </SignedIn>
    </ClerkProvider>
  );
}
