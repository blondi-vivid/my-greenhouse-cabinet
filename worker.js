const MAX_BODY_BYTES = 1200000;
function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
  });
}
async function authorized(request, secret) {
  const supplied = request.headers.get("Authorization") || "";
  const expected = "Bearer " + secret;
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected))
  ]);
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}
async function readBody(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Empty request");
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("Photo is too large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
function validSetup(setup) {
  return setup && typeof setup.notes === "string" && setup.notes.length <= 10000 &&
    (setup.temperature === null || Number.isFinite(setup.temperature) && setup.temperature >= -50 && setup.temperature <= 150) &&
    (setup.humidity === null || Number.isFinite(setup.humidity) && setup.humidity >= 0 && setup.humidity <= 100) &&
    (setup.photo === null || typeof setup.photo === "string" && setup.photo.length <= 1000000 &&
      /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(setup.photo));
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (url.pathname !== "/api/setup") return json({ error: "Not found" }, 404);
    if (!env.DB) return json({ error: "The DB database binding is missing." }, 503);
    if (!env.SETUP_SYNC_KEY) return json({ error: "Add the SETUP_SYNC_KEY secret in Cloudflare to enable syncing." }, 503);
    if (!await authorized(request, env.SETUP_SYNC_KEY)) return json({ error: "The sync password is incorrect." }, 401);
    if (!["GET", "PUT"].includes(request.method)) return json({ error: "Method not allowed" }, 405);
    if (request.method === "PUT" && request.headers.get("Origin") && request.headers.get("Origin") !== url.origin) {
      return json({ error: "Origin not allowed" }, 403);
    }
    try {
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS cabinet_setup (id INTEGER PRIMARY KEY CHECK(id = 1), version INTEGER NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
      if (request.method === "GET") {
        const row = await env.DB.prepare("SELECT version, payload, updated_at FROM cabinet_setup WHERE id = 1").first();
        return json(row ? { version: row.version, setup: JSON.parse(row.payload), updatedAt: row.updated_at } :
          { version: 0, setup: null, updatedAt: null });
      }
      let body;
      try { body = await readBody(request); }
      catch { return json({ error: "The setup could not be read. Use a smaller photo and try again." }, 400); }
      if (!Number.isSafeInteger(body.baseVersion) || body.baseVersion < 0 || !validSetup(body.setup)) {
        return json({ error: "Invalid setup details or photo." }, 400);
      }
      const setup = {
        notes: body.setup.notes,
        temperature: body.setup.temperature,
        humidity: body.setup.humidity,
        photo: body.setup.photo
      };
      const now = new Date().toISOString();
      const statement = body.baseVersion === 0
        ? env.DB.prepare("INSERT INTO cabinet_setup (id, version, payload, updated_at) VALUES (1, 1, ?, ?) ON CONFLICT(id) DO NOTHING").bind(JSON.stringify(setup), now)
        : env.DB.prepare("UPDATE cabinet_setup SET version = version + 1, payload = ?, updated_at = ? WHERE id = 1 AND version = ?").bind(JSON.stringify(setup), now, body.baseVersion);
      const result = await statement.run();
      if (!result.meta.changes) {
        return json({ error: "Another device changed the cloud copy. Load it before saving again." }, 409);
      }
      return json({ version: body.baseVersion + 1, updatedAt: now });
    } catch {
      return json({ error: "Cloud storage could not be reached. Your browser copy is still available." }, 503);
    }
  }
};
