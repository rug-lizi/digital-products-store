"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function OrderStatus() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") || "";
  const [status, setStatus] = useState("Confirming your payment…");
  const [message, setMessage] = useState("This normally takes only a few seconds.");
  const [downloadUrl, setDownloadUrl] = useState("");

  useEffect(() => {
    let attempts = 0;
    let timer: number | undefined;
    async function check() {
      attempts += 1;
      const response = await fetch(`/api/order-status?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
      const data = (await response.json()) as { status?: string; message?: string; downloadUrl?: string };
      if (data.status === "paid" && data.downloadUrl) {
        setStatus("Payment confirmed");
        setMessage("Your secure download is ready. The link has limited time and uses.");
        setDownloadUrl(data.downloadUrl);
        return;
      }
      if (["expired", "exhausted", "failed", "refunded", "invalid"].includes(data.status || "")) {
        setStatus("We could not confirm the order");
        setMessage(data.message || "Please contact support with your payment receipt.");
        return;
      }
      if (attempts < 20) timer = window.setTimeout(check, 2000);
      else setMessage("Confirmation is taking longer than expected. Refresh this page in a minute.");
    }
    void check();
    return () => window.clearTimeout(timer);
  }, [sessionId]);

  return (
    <main className="admin-shell">
      <section className="login-card">
        <h1>{status}</h1>
        <p>{message}</p>
        {downloadUrl && <a className="admin-button" href={downloadUrl}>Download product</a>}
        <p>Need help? <a href="mailto:liwangyiwei@gmail.com">Contact support</a>.</p>
      </section>
    </main>
  );
}
