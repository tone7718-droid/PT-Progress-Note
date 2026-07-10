/* ── AES-GCM 암호화 서비스 ──
 *
 * 랜덤 256-bit 키를 최초 실행 시 생성해 보관하고, 환자 노트(pt_local_notes)를
 * 암호화해 평문 노출을 방지. 내보내기/가져오기는 localDataService에서
 * 복호화 후 처리해 서식이 유지됨.
 *
 * 키 보관 위치:
 *  - Tauri 데스크톱: OS 보안 저장소 (Windows 자격 증명 관리자 / macOS
 *    Keychain / Linux Secret Service) — src-tauri 의 keyring 커맨드 경유.
 *    기존 localStorage 키는 최초 실행 시 키링으로 자동 이관.
 *  - 웹/모바일: localStorage 폴백. 이 경우 키가 암호문과 같은 저장소라
 *    기기(브라우저 프로필) 접근자에게는 보호가 되지 않음 (README 참고).
 */

import { isTauri } from "@/lib/isTauri";

const ENC_KEY_STORAGE = "pt_enc_key_v1";

let _cachedKey: CryptoKey | null = null;

async function loadStoredKeyHex(): Promise<string | null> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const fromKeyring = await invoke<string | null>("keyring_get_enc_key");
      if (fromKeyring) return fromKeyring;
      // 구버전이 localStorage 에 두었던 키를 키링으로 1회 이관
      const legacy = window.localStorage.getItem(ENC_KEY_STORAGE);
      if (legacy) {
        await invoke("keyring_set_enc_key", { value: legacy });
        window.localStorage.removeItem(ENC_KEY_STORAGE);
        return legacy;
      }
      return null;
    } catch {
      /* 키링 사용 불가 (Secret Service 미기동 등) → localStorage 폴백 */
    }
  }
  return window.localStorage.getItem(ENC_KEY_STORAGE);
}

async function persistKeyHex(hex: string): Promise<void> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("keyring_set_enc_key", { value: hex });
      return;
    } catch {
      /* 키링 사용 불가 → localStorage 폴백 */
    }
  }
  window.localStorage.setItem(ENC_KEY_STORAGE, hex);
}

function bufToHex(buf: Uint8Array<ArrayBuffer>): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuf(hex: string): Uint8Array<ArrayBuffer> {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return arr;
}

async function getKey(): Promise<CryptoKey> {
  if (_cachedKey) return _cachedKey;
  if (typeof window === "undefined") throw new Error("browser-only");

  const stored = await loadStoredKeyHex();
  if (stored) {
    _cachedKey = await crypto.subtle.importKey(
      "raw",
      hexToBuf(stored),
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
    return _cachedKey;
  }

  _cachedKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const exported = await crypto.subtle.exportKey("raw", _cachedKey);
  await persistKeyHex(bufToHex(new Uint8Array(exported)));
  return _cachedKey;
}

export async function encryptData(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv); // 반환값 대신 원본 버퍼 사용 → ArrayBuffer 타입 유지
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return `${bufToHex(iv)}:${bufToHex(new Uint8Array(ciphertext))}`;
}

export async function decryptData(encrypted: string): Promise<string> {
  const sep = encrypted.indexOf(":");
  if (sep !== 24) throw new Error("invalid format"); // IV는 항상 24자 hex (12 bytes)
  const key = await getKey();
  const iv = hexToBuf(encrypted.slice(0, sep));
  const ciphertext = hexToBuf(encrypted.slice(sep + 1));
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

/** 테스트/초기화 시 캐시 무효화 */
export function invalidateEncKeyCache(): void {
  _cachedKey = null;
}

/* ── passphrase 기반 암복호화 (백업 파일용) ──
 *
 * 위 로컬 키(pt_enc_key_v1)와 달리 기기 밖으로 나가는 백업 파일을 보호한다.
 * 사용자가 입력한 passphrase 에서 PBKDF2 로 AES-GCM 키를 파생 —
 * 키가 파일이나 localStorage 어디에도 저장되지 않으므로, passphrase 를
 * 모르면 백업 파일만으로는 복호화할 수 없다.
 */

const PASSPHRASE_KDF_ITERATIONS = 200_000;

async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PASSPHRASE_KDF_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export interface PassphraseEncrypted {
  kdf: { algo: "PBKDF2-SHA256"; iterations: number; salt: string }; // salt: hex
  iv: string;   // hex (12 bytes)
  data: string; // hex ciphertext
}

export async function encryptWithPassphrase(
  plaintext: string,
  passphrase: string
): Promise<PassphraseEncrypted> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const key = await deriveKeyFromPassphrase(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return {
    kdf: { algo: "PBKDF2-SHA256", iterations: PASSPHRASE_KDF_ITERATIONS, salt: bufToHex(salt) },
    iv: bufToHex(iv),
    data: bufToHex(new Uint8Array(ciphertext)),
  };
}

export async function decryptWithPassphrase(
  payload: PassphraseEncrypted,
  passphrase: string
): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: hexToBuf(payload.kdf.salt),
      iterations: payload.kdf.iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: hexToBuf(payload.iv) },
    key,
    hexToBuf(payload.data)
  );
  return new TextDecoder().decode(plaintext);
}
