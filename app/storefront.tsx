"use client";

import { useEffect, useState } from "react";
import { products } from "./catalog";

export default function Storefront() {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch("/api/analytics/page-view", { method: "POST", keepalive: true });
  }, []);

  async function checkout(priceId: string) {
    setBusy(priceId);
    setMessage("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Checkout failed");
      window.location.assign(payload.url);
    } catch {
      setMessage("Checkout is temporarily unavailable. Please try again.");
      setBusy(null);
    }
  }

  return (
    <main className="store-shell">
      <header className="hero">
        <div className="eyebrow">⚡ Instant download</div>
        <h1>Adam Li Digital</h1>
        <p>
          Practical digital tools to sharpen your workflow, automate repetitive
          work and build with AI.
        </p>
      </header>

      <section className="product-grid" aria-label="Digital products">
        {products.map((product) => (
          <article className="product-card" key={product.priceId}>
            <div className="product-icon" aria-hidden="true">{product.icon}</div>
            <h2>{product.name}</h2>
            <p className="description">{product.description}</p>
            <div className="features">
              {product.features.map((feature) => <span key={feature}>{feature}</span>)}
            </div>
            <div className="price">
              ${(product.price / 100).toFixed(2)} <small>one-time</small>
            </div>
            <button
              className="buy-button"
              type="button"
              disabled={busy === product.priceId}
              onClick={() => checkout(product.priceId)}
            >
              {busy === product.priceId ? "Redirecting…" : "Buy now"}
            </button>
          </article>
        ))}
      </section>

      {message && <div className="toast" role="alert">{message}</div>}

      <footer>
        Secure payments via Stripe · Instant download after purchase ·{" "}
        <a href="mailto:liwangyiwei@gmail.com">Contact support</a>
      </footer>
    </main>
  );
}
