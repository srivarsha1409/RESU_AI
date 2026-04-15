import React, { useEffect, useState } from 'react';

const API_BASE = 'http://127.0.0.1:8000';

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const email = localStorage.getItem('email');
    if (!email) {
      setError('No user session found. Please log in.');
      setLoading(false);
      return;
    }

    const fetchPortfolio = async () => {
      try {
        const res = await fetch(`${API_BASE}/user/portfolio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || data.error || 'Failed to load portfolio');
        }
        setPortfolio(data.portfolio || null);
      } catch (err) {
        setError(err.message || 'Failed to load portfolio');
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-700 to-slate-900 flex items-center justify-center text-white">
        Loading portfolio...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-700 to-slate-900 flex items-center justify-center">
        <div className="bg-white/10 border border-red-400/40 rounded-2xl p-6 max-w-lg text-center">
          <p className="text-red-200 mb-2 font-semibold">Portfolio Error</p>
          <p className="text-slate-100 text-sm mb-4">{error}</p>
          <a href="/user" className="text-purple-200 underline text-sm">Go back to dashboard</a>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-700 to-slate-900 flex items-center justify-center text-white">
        No portfolio data found. Please generate it from your dashboard.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto bg-white/10 border border-white/20 rounded-2xl p-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">{portfolio.name}</h1>
            <p className="text-purple-200 text-sm">{portfolio.headline}</p>
          </div>
          <a
            href="/user"
            className="px-4 py-2 rounded-xl border border-white/30 text-xs text-purple-100 bg-white/10 hover:bg-white/20 transition"
          >
            Back to Dashboard
          </a>
        </header>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">About</h2>
          <p className="text-slate-100 text-sm leading-relaxed">{portfolio.summary}</p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {portfolio.skills?.map((s, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-100 text-xs border border-purple-400/40"
              >
                {s}
              </span>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">Projects</h2>
          <div className="space-y-4">
            {portfolio.projects?.map((p, i) => (
              <div key={i} className="bg-black/20 rounded-xl p-4 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-1">{p.title}</h3>
                {p.technologies?.length > 0 && (
                  <p className="text-xs text-purple-200 mb-1">
                    Tech: {p.technologies.join(', ')}
                  </p>
                )}
                <p className="text-sm text-slate-100 mb-2">{p.description}</p>
                <div className="flex gap-3 text-xs">
                  {p.github && (
                    <a href={p.github} target="_blank" rel="noreferrer" className="text-sky-300 underline">
                      GitHub
                    </a>
                  )}
                  {p.link && (
                    <a href={p.link} target="_blank" rel="noreferrer" className="text-green-300 underline">
                      Live Demo
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-white/10 pt-4 text-sm text-slate-100">
          <p>Email: {portfolio.contacts?.email}</p>
          {portfolio.contacts?.linkedin && <p>LinkedIn: {portfolio.contacts.linkedin}</p>}
          {portfolio.contacts?.github && <p>GitHub: {portfolio.contacts.github}</p>}
        </section>
      </div>
    </div>
  );
}
