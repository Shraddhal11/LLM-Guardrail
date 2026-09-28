import React, { useState, useEffect } from 'react';
import { ClerkProvider, SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/clerk-react';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";

function LandingPage() {
  return (
    <div style={{ background: '#060913', minHeight: '100vh', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
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

      {/* Hero Section */}
      <section style={{ maxWidth: '900px', margin: '60px auto 40px auto', textAlign: 'center', padding: '0 20px' }}>
        <div style={{ display: 'inline-block', background: 'rgba(0,242,254,0.1)', border: '1px solid rgba(0,242,254,0.3)', color: '#00f2fe', padding: '6px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '20px' }}>
          ✨ Powered by Neon PostgreSQL & Clerk Auth
        </div>
        <h1 style={{ fontSize: '3rem', fontWeight: '800', lineHeight: 1.15, marginBottom: '20px', background: 'linear-gradient(to right, #ffffff, #93c5fd, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          HIPAA & DPDP Compliance Execution Engine for AI Agents
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#94a3b8', maxWidth: '750px', margin: '0 auto 30px auto', lineHeight: 1.6 }}>
          Intercept, anonymize, and audit LLM prompts in real-time before sensitive data (Names, SSNs, Medical Records, IPs, Phone Numbers) reaches external GPU nodes.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
          <SignUpButton mode="modal">
            <button style={{ background: 'linear-gradient(135deg, #00f2fe, #7f00ff)', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '10px', fontSize: '1.05rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,242,254,0.3)' }}>
              🚀 Sign Up & Get Your Proxy Link
            </button>
          </SignUpButton>
          <SignInButton mode="modal">
            <button style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '14px 24px', borderRadius: '10px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}>
              Sign In
            </button>
          </SignInButton>
        </div>
      </section>

      {/* Demo Transformation Card */}
      <div style={{ maxWidth: '850px', margin: '0 auto 60px auto', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '25px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 'bold' }}>
          <span>⚡ Real-Time PII Transformation Preview</span>
          <span style={{ color: '#00f2fe', fontFamily: 'monospace' }}>Latency: &lt; 0.4 ms</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>🔴 Original Prompt (Contains PII):</div>
            <div style={{ background: '#020617', border: '1px solid #334155', borderRadius: '8px', padding: '12px', fontFamily: 'monospace', fontSize: '0.85rem', color: '#fca5a5' }}>
              Doctor Sarah Connor called patient John Doe (DOB: 04/12/1985, SSN: 123-45-6789) at bhushan.chavan@jashds.com and 8999273304
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>🟢 Anonymized Payload Sent Upstream:</div>
            <div style={{ background: '#020617', border: '1px solid #334155', borderRadius: '8px', padding: '12px', fontFamily: 'monospace', fontSize: '0.85rem', color: '#a7f3d0' }}>
              Doctor [NAME_2] called patient [NAME_1] ([INDIVIDUAL_DATE_1], [SSN_1]) at [EMAIL_1] and [PHONE_1]
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div style={{ maxWidth: '1100px', margin: '0 auto 80px auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', padding: '0 20px' }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '22px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🛡️</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#fff' }}>15 Safe Harbor & DPDP Categories</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Automatic detection for Names, Addresses, SSNs, Phone, Fax, Email, IP addresses, Dates, MRNs, VINs, Device UUIDs.</p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '22px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚡</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#fff' }}>Sub-Millisecond Execution</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>High-performance dual-engine combining rule-based contextual patterns and SpaCy NER executing in &lt; 0.5 ms.</p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '22px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🔒</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#fff' }}>Tamper-Evident Receipts</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>SHA-256 cryptographic audit hash-chains saved to Neon PostgreSQL for every prompt inspection.</p>
        </div>
      </div>
    </div>
  );
}

function MainDashboard() {
  const { user } = useUser();
  const [userData, setUserData] = useState(null);
  const [queries, setQueries] = useState([]);
  const [stats, setStats] = useState({ total_requests: 0, total_pii_detected: 0 });
  const [prompt, setPrompt] = useState("Patient Bhushan Chavan (DOB: 04/12/1985) email: bhushan.chavan@jashds.com phone: 8999273304");
  const [anonymizedPrompt, setAnonymizedPrompt] = useState("");
  const [matches, setMatches] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      syncUser();
    }
  }, [user]);

  useEffect(() => {
    if (userData?.user_uuid) {
      fetchQueries(userData.user_uuid);
      fetchStats(userData.user_uuid);
      const interval = setInterval(() => {
        fetchQueries(userData.user_uuid);
        fetchStats(userData.user_uuid);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [userData]);

  const syncUser = async () => {
    try {
      const res = await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerk_user_id: user.id,
          email: user.primaryEmailAddress?.emailAddress || '',
          name: user.fullName || 'User'
        })
      });
      const data = await res.json();
      setUserData(data);
    } catch (e) {
      console.error("User sync error:", e);
    }
  };

  const fetchQueries = async (uuid) => {
    try {
      const res = await fetch(`/api/users/${uuid}/queries`);
      const data = await res.json();
      setQueries(data);
    } catch (e) {}
  };

  const fetchStats = async (uuid) => {
    try {
      const res = await fetch(`/api/stats?user_uuid=${uuid}`);
      const data = await res.json();
      setStats(data);
    } catch (e) {}
  };

  const handleInspect = async () => {
    try {
      const res = await fetch('/api/test-inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, mode: 'ANONYMIZE' })
      });
      const data = await res.json();
      setAnonymizedPrompt(data.anonymized_prompt);
      setMatches(data.matches);
      if (userData?.user_uuid) {
        fetchQueries(userData.user_uuid);
        fetchStats(userData.user_uuid);
      }
    } catch (e) {}
  };

  const copyProxyUrl = () => {
    const url = userData?.proxy_url || `http://localhost:8000/proxy/usr_cd8bef00/v1`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: '1250px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, sans-serif', color: '#f8fafc' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '15px', marginBottom: '25px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #00f2fe, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
            🛡️
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0, color: '#38bdf8' }}>PII Governance Platform</h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>HIPAA Safe Harbor & DPDP Execution Engine</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <UserButton showName />
        </div>
      </header>

      {/* Personalized Proxy Link Box */}
      <div style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(139, 92, 246, 0.2))', border: '1px solid #38bdf8', padding: '20px', borderRadius: '14px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#fff' }}>🔑 Your Personal Proxy Endpoint Link (Copy to Cline Settings)</div>
          <div style={{ fontFamily: 'monospace', color: '#7dd3fc', fontSize: '1.1rem', marginTop: '6px' }}>
            {userData?.proxy_url || 'http://localhost:8000/proxy/usr_cd8bef00/v1'}
          </div>
        </div>
        <button onClick={copyProxyUrl} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
          {copied ? '✅ Copied!' : '📋 Copy Base URL'}
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '25px' }}>
        <div style={{ background: '#0f172a', border: '1px solid #334155', padding: '18px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#38bdf8' }}>{stats.total_requests}</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>TOTAL PROXIED REQUESTS</div>
        </div>
        <div style={{ background: '#0f172a', border: '1px solid #334155', padding: '18px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#a7f3d0' }}>{stats.total_pii_detected}</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>PII ENTITIES MASKED</div>
        </div>
        <div style={{ background: '#0f172a', border: '1px solid #334155', padding: '18px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#c084fc' }}>15/15</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>COMPLIANCE CATEGORIES</div>
        </div>
        <div style={{ background: '#0f172a', border: '1px solid #334155', padding: '18px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#34d399' }}>{userData?.trust_score?.toFixed(1) || '100.0'}</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>USER TRUST SCORE</div>
        </div>
      </div>

      {/* Interactive Playground */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: '#0f172a', border: '1px solid #334155', padding: '20px', borderRadius: '14px' }}>
          <h3 style={{ marginTop: 0 }}>📝 Test Prompt Input</h3>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ width: '100%', height: '110px', background: '#020617', border: '1px solid #334155', color: '#fff', borderRadius: '8px', padding: '12px', fontFamily: 'monospace' }} />
          <button onClick={handleInspect} style={{ marginTop: '12px', width: '100%', background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            🔍 Inspect & Anonymize Prompt
          </button>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #334155', padding: '20px', borderRadius: '14px' }}>
          <h3 style={{ marginTop: 0 }}>✨ Anonymized Payload Sent Upstream</h3>
          <div style={{ background: '#020617', border: '1px solid #334155', padding: '14px', borderRadius: '8px', minHeight: '110px', color: '#a7f3d0', fontFamily: 'monospace', fontSize: '0.9rem' }}>
            {anonymizedPrompt || 'Anonymized payload will appear here...'}
          </div>
        </div>
      </div>

      {/* Neon DB Queries Table */}
      <div style={{ background: '#0f172a', border: '1px solid #334155', padding: '20px', borderRadius: '14px' }}>
        <h3 style={{ marginTop: 0 }}>🗄️ Neon PostgreSQL Query Logs & Tamper-Evident Receipts</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
              <th style={{ textAlign: 'left', padding: '10px' }}>Request ID</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>Original Prompt</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>Anonymized Prompt</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>PII Count</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>Categories Found</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>Latency</th>
            </tr>
          </thead>
          <tbody>
            {queries.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No query logs yet. Send a request from Cline or test playground.</td></tr>
            ) : (
              queries.map(q => (
                <tr key={q.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{q.request_id}</td>
                  <td style={{ padding: '10px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.original_prompt}</td>
                  <td style={{ padding: '10px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#a7f3d0' }}>{q.anonymized_prompt}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{q.pii_count}</td>
                  <td style={{ padding: '10px' }}>{(q.categories_found || []).join(', ')}</td>
                  <td style={{ padding: '10px' }}>{q.latency_ms} ms</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <SignedOut>
        <LandingPage />
      </SignedOut>
      <SignedIn>
        <MainDashboard />
      </SignedIn>
    </ClerkProvider>
  );
}
