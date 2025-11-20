import CryptoJS from "crypto-js";

// Encrypt with AES-256 using base64 key
export function encryptPayload(payload) {
  const aesKey = sessionStorage.getItem("aes-key"); // stored base64 key
  if (!aesKey) {
    throw new Error("AES key not found in sessionStorage!");
  }

  // Convert base64 key → CryptoJS WordArray
  const key = CryptoJS.enc.Base64.parse(aesKey);

  // Generate random IV (16 bytes)
  const iv = CryptoJS.lib.WordArray.random(16);

  // Encrypt using AES-256-CBC
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(payload), key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return {
    cipher: encrypted.toString(),         // ciphertext (base64)
    iv: CryptoJS.enc.Base64.stringify(iv) // IV (base64)
  };
}
