"use client";

import { useEffect, useState, type FormEvent } from "react";

type Stats = {
  pageViews: number;
  uniqueVisitors: number;
  checkoutAttempts: number;
  completedSales: number;
  revenue: number;
  perProduct: Record<string, { views: number; checkouts: number; sales: number; revenue: number }>;
  productInfo: Record<string, { name: string; icon: string }>;
  recentEvents: Array<{ type: string; ip: string; priceId?: string; amount?: number; orderId?: string; createdAt: number }>;
};

function money(value: number) {
  return `$${(value / 100).toFixed(2)}`;
}

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);

  async function loadStats() {
    const response = await fetch("/api/admin/stats", { cache: "no-store" });
    if (!response.ok) {
      setAuthenticated(false);
      setStats(null);
      return;
    }
    setAuthenticated(true);
    setStats((await response.json()) as Stats);
  }

  useEffect(() => {
    const kickoff = window.setTimeout(() => void loadStats(), 0);
    const timer = window.setInterval(() => authenticated && void loadStats(), 30_000);
    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(timer);
    };
  }, [authenticated]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(body.error || "Invalid password");
      return;
    }
    setPassword("");
    await loadStats();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
    setStats(null);
  }

  if (!authenticated) {
    return (
      <main className="admin-shell">
        <form className="login-card" onSubmit={login}>
          <h1>🔐 Admin</h1>
          <p>Enter your password to access the dashboard.</p>
          {error && <div className="error" role="alert">{error}</div>}
          <input
            aria-label="Admin password"
            autoComplete="current-password"
            autoFocus
            minLength={12}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
          <button className="admin-button" type="submit">Log in</button>
        </form>
      </main>
    );
  }

  const cards = [
    ["Page views", stats?.pageViews || 0],
    ["Unique visitors", stats?.uniqueVisitors || 0],
    ["Checkout attempts", stats?.checkoutAttempts || 0],
    ["Completed sales", stats?.completedSales || 0],
    ["Total revenue", money(stats?.revenue || 0)],
  ];

  return (
    <main className="admin-shell">
      <div className="admin-panel">
        <header className="admin-header">
          <div>
            <h1>📊 Store dashboard</h1>
            <span>Adam Li Digital</span>
          </div>
          <div className="admin-actions">
            <button className="admin-button" onClick={() => void loadStats()}>Refresh</button>
            <button className="admin-button" onClick={() => void logout()}>Log out</button>
          </div>
        </header>
        <section className="stat-grid">
          {cards.map(([label, value]) => (
            <div className="stat-card" key={String(label)}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>
        <section className="table-card">
          <h2>Per-product performance</h2>
          <table>
            <thead><tr><th>Product</th><th>Views</th><th>Checkouts</th><th>Sales</th><th>Revenue</th></tr></thead>
            <tbody>
              {Object.entries(stats?.perProduct || {}).map(([priceId, row]) => (
                <tr key={priceId}>
                  <td>{stats?.productInfo[priceId]?.icon} {stats?.productInfo[priceId]?.name || priceId}</td>
                  <td>{row.views}</td><td>{row.checkouts}</td><td>{row.sales}</td><td>{money(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="table-card">
          <h2>Recent activity</h2>
          <table>
            <thead><tr><th>Type</th><th>Visitor</th><th>Product / order</th><th>Time</th></tr></thead>
            <tbody>
              {(stats?.recentEvents || []).map((row, index) => (
                <tr key={`${row.createdAt}-${index}`}>
                  <td>{row.type}</td>
                  <td>{row.ip}</td>
                  <td>{stats?.productInfo[row.priceId || ""]?.name || row.orderId || "—"}</td>
                  <td>{new Date(row.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
