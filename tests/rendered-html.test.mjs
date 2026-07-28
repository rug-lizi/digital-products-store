import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
      DB: {},
      BUCKET: {},
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders all six store products with security headers", async () => {
  const response = await render("/");
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("strict-transport-security") || "", /max-age=31536000/);
  assert.match(html, /Adam Li Digital/);
  assert.equal((html.match(/Buy now/g) || []).length, 6);
});

test("renders the admin password login surface", async () => {
  const response = await render("/admin");
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Admin password/);
  assert.match(html, /Log in/);
});
