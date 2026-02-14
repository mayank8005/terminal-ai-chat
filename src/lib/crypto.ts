export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password) as BufferSource,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function isSecureContext(): boolean {
  return typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined";
}

export async function encryptText(
  text: string,
  password: string
): Promise<{ ciphertext: string; iv: string }> {
  if (!isSecureContext()) {
    // Fallback: base64 encode when Web Crypto is unavailable (HTTP on non-localhost)
    const encoded = btoa(unescape(encodeURIComponent(text)));
    return { ciphertext: encoded, iv: "none" };
  }

  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    encoder.encode(text) as BufferSource
  );

  // Prepend salt to ciphertext
  const combined = new Uint8Array(salt.length + new Uint8Array(encrypted).length);
  combined.set(salt);
  combined.set(new Uint8Array(encrypted), salt.length);

  return {
    ciphertext: Buffer.from(combined).toString("base64"),
    iv: Buffer.from(iv).toString("base64"),
  };
}

export async function decryptText(
  ciphertextB64: string,
  ivB64: string,
  password: string
): Promise<string> {
  if (ivB64 === "none") {
    // Fallback: base64 decode (matches the non-secure-context encrypt path)
    return decodeURIComponent(escape(atob(ciphertextB64)));
  }

  const combined = Buffer.from(ciphertextB64, "base64");
  const iv = Buffer.from(ivB64, "base64");

  const salt = combined.slice(0, 16);
  const ciphertext = combined.slice(16);

  const key = await deriveKey(password, new Uint8Array(salt));

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) as BufferSource },
    key,
    new Uint8Array(ciphertext) as BufferSource
  );

  return new TextDecoder().decode(decrypted);
}
