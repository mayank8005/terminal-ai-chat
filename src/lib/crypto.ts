import CryptoJS from "crypto-js";

export async function encryptText(
  text: string,
  password: string
): Promise<{ ciphertext: string; iv: string }> {
  const salt = CryptoJS.lib.WordArray.random(16);
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 100000,
    hasher: CryptoJS.algo.SHA256,
  });
  const iv = CryptoJS.lib.WordArray.random(12);

  const encrypted = CryptoJS.AES.encrypt(text, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // Prepend salt to ciphertext
  const combined = salt.concat(encrypted.ciphertext);

  return {
    ciphertext: CryptoJS.enc.Base64.stringify(combined),
    iv: CryptoJS.enc.Base64.stringify(iv),
  };
}

export async function decryptText(
  ciphertextB64: string,
  ivB64: string,
  password: string
): Promise<string> {
  // Handle legacy base64-only fallback
  if (ivB64 === "none") {
    return decodeURIComponent(escape(atob(ciphertextB64)));
  }

  const combined = CryptoJS.enc.Base64.parse(ciphertextB64);
  const iv = CryptoJS.enc.Base64.parse(ivB64);

  // Extract salt (first 16 bytes = 4 words)
  const salt = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);
  const ciphertext = CryptoJS.lib.WordArray.create(
    combined.words.slice(4),
    combined.sigBytes - 16
  );

  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 100000,
    hasher: CryptoJS.algo.SHA256,
  });

  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext } as CryptoJS.lib.CipherParams,
    key,
    {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  );

  return decrypted.toString(CryptoJS.enc.Utf8);
}
