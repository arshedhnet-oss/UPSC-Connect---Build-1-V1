import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Base64 helpers (Deno-safe, no atob) ──

const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64UrlDecode(str: string): Uint8Array {
  // Convert base64url → standard base64
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) b64 += "=";

  // Manual base64 decode (avoids atob issues in Deno)
  const bytes: number[] = [];
  for (let i = 0; i < b64.length; i += 4) {
    const a = B64_CHARS.indexOf(b64[i]);
    const b = B64_CHARS.indexOf(b64[i + 1]);
    const c = b64[i + 2] === "=" ? 0 : B64_CHARS.indexOf(b64[i + 2]);
    const d = b64[i + 3] === "=" ? 0 : B64_CHARS.indexOf(b64[i + 3]);
    bytes.push((a << 2) | (b >> 4));
    if (b64[i + 2] !== "=") bytes.push(((b & 15) << 4) | (c >> 2));
    if (b64[i + 3] !== "=") bytes.push(((c & 3) << 6) | d);
  }
  return new Uint8Array(bytes);
}

function base64UrlEncode(data: Uint8Array | ArrayBuffer): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += B64_CHARS[(a >> 2) & 63];
    result += B64_CHARS[((a & 3) << 4) | ((b >> 4) & 15)];
    result += i + 1 < bytes.length ? B64_CHARS[((b & 15) << 2) | ((c >> 6) & 3)] : "";
    result += i + 2 < bytes.length ? B64_CHARS[c & 63] : "";
  }
  // base64url: no padding, url-safe chars
  return result.replace(/\+/g, "-").replace(/\//g, "_");
}

// ── Crypto helpers ──

function derToRaw(der: Uint8Array): Uint8Array {
  const raw = new Uint8Array(64);
  let offset = 2;
  if (der[offset] !== 0x02) throw new Error("Invalid DER");
  offset++;
  const rLen = der[offset++];
  const rStart = rLen > 32 ? offset + (rLen - 32) : offset;
  const rDest = rLen < 32 ? 32 - rLen : 0;
  raw.set(der.slice(rStart, offset + rLen), rDest);
  offset += rLen;
  if (der[offset] !== 0x02) throw new Error("Invalid DER");
  offset++;
  const sLen = der[offset++];
  const sStart = sLen > 32 ? offset + (sLen - 32) : offset;
  const sDest = sLen < 32 ? 64 - sLen : 32;
  raw.set(der.slice(sStart, offset + sLen), sDest);
  return raw;
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((a, b) => a + b.length, 0);
  const result = new Uint8Array(len);
  let off = 0;
  for (const arr of arrays) { result.set(arr, off); off += arr.length; }
  return result;
}

async function hkdfSha256(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const saltKey = await crypto.subtle.importKey(
    "raw", salt.length > 0 ? salt : new Uint8Array(32),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", saltKey, ikm));
  const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, concatBytes(info, new Uint8Array([1]))));
  return okm.slice(0, length);
}

// ── Web Push ──

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<Response> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.hostname}`;

  // VAPID JWT
  const publicKeyBytes = base64UrlDecode(vapidPublicKey);
  const privateKeyBytes = base64UrlDecode(vapidPrivateKey);

  console.log(`[Push] Public key: ${publicKeyBytes.length} bytes, Private key: ${privateKeyBytes.length} bytes`);

  const jwk = {
    kty: "EC", crv: "P-256",
    x: base64UrlEncode(publicKeyBytes.slice(1, 33)),
    y: base64UrlEncode(publicKeyBytes.slice(33, 65)),
    d: base64UrlEncode(privateKeyBytes),
  };

  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);

  const now = Math.floor(Date.now() / 1000);
  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claimsB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ aud: audience, exp: now + 12 * 3600, sub: vapidSubject })));
  const unsignedToken = `${headerB64}.${claimsB64}`;

  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsignedToken));
  const jwt = `${unsignedToken}.${base64UrlEncode(derToRaw(new Uint8Array(signature)))}`;

  // Encrypt payload
  const encrypted = await encryptPayload(subscription.p256dh, subscription.auth, new TextEncoder().encode(payload));

  return fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${base64UrlEncode(publicKeyBytes)}`,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "86400",
    },
    body: encrypted,
  });
}

async function encryptPayload(clientPublicKeyB64: string, clientAuthB64: string, plaintext: Uint8Array): Promise<Uint8Array> {
  const clientPublicKey = base64UrlDecode(clientPublicKeyB64);
  const clientAuth = base64UrlDecode(clientAuthB64);

  const localKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const localPublicKey = new Uint8Array(await crypto.subtle.exportKey("raw", localKeyPair.publicKey));

  const clientKey = await crypto.subtle.importKey("raw", clientPublicKey, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: clientKey }, localKeyPair.privateKey, 256));

  const enc = new TextEncoder();
  const authInfo = concatBytes(enc.encode("WebPush: info\0"), clientPublicKey, localPublicKey);
  const ikm = await hkdfSha256(clientAuth, sharedSecret, authInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdfSha256(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdfSha256(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const padded = concatBytes(plaintext, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded));

  const rsBytes = new Uint8Array(4);
  new DataView(rsBytes.buffer).setUint32(0, 4096);

  return concatBytes(salt, rsBytes, new Uint8Array([localPublicKey.length]), localPublicKey, encrypted);
}

// ── Main Handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("[Push] VAPID keys not configured");
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_ids, title, body, url, tag } = await req.json();

    if (!user_ids || !Array.isArray(user_ids) || !title) {
      return new Response(JSON.stringify({ error: "Missing user_ids or title" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions").select("*").in("user_id", user_ids);

    if (error) {
      console.error("Failed to fetch subscriptions:", error);
      return new Response(JSON.stringify({ error: "DB error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[Push] No subscriptions found for users:", user_ids);
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({ title, body, url, tag });
    let sent = 0, failed = 0;
    const staleIds: string[] = [];

    for (const sub of subscriptions) {
      try {
        console.log(`[Push] Sending to ${sub.endpoint.slice(0, 60)}...`);
        const resp = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload, vapidPublicKey, vapidPrivateKey, "mailto:admin@upscconnect.in"
        );

        if (resp.status === 201 || resp.status === 200) {
          sent++;
          console.log(`[Push] ✓ Delivered`);
        } else if (resp.status === 404 || resp.status === 410) {
          staleIds.push(sub.id);
          failed++;
          console.log(`[Push] Stale subscription (${resp.status}), will remove`);
        } else {
          const text = await resp.text();
          console.error(`[Push] Failed ${resp.status}: ${text}`);
          failed++;
        }
      } catch (err) {
        console.error(`[Push] Error for ${sub.endpoint.slice(0, 60)}:`, err);
        failed++;
      }
    }

    if (staleIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", staleIds);
    }

    console.log(`[Push] Done — sent: ${sent}, failed: ${failed}, cleaned: ${staleIds.length}`);
    return new Response(
      JSON.stringify({ sent, failed, cleaned: staleIds.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-push-notification error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
