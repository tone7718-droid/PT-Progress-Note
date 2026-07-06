/**
 * localStorage 기반 데이터 서비스 (현재 운영 중인 단일 데이터 소스)
 *
 * 모든 노트·치료사 데이터는 브라우저/Tauri WebView 의 localStorage 에 저장.
 * 데스크톱 앱에서는 OS의 사용자 프로필 폴더에 영구 저장 (Tauri WebView2 storage).
 *
 * 데이터 키:
 *   - pt_local_notes        : NoteData[] (AES-GCM 암호화 저장)
 *   - pt_local_therapists   : TherapistRecord[]
 *   - pt_local_session      : { uid: string }  // 로그인 세션
 *   - pt_enc_key_v1         : 256-bit AES-GCM 키 (hex)
 *
 * 기본 마스터 계정: id "master" / pw "0000" (앱 첫 실행 시 자동 생성)
 *
 * 클라우드 모드 복귀 시: 새 lib/dataService.ts 작성 + useNoteStore 의 import 변경
 * (이전 클라우드 코드는 git history `14316af` 이전 커밋에서 참조 가능)
 */

import type { NoteData, TherapistRecord, Therapist } from "@/types";
import { hashPassword, verifyPassword, isLegacyHash } from "@/components/hashUtils";
import { encryptData, decryptData } from "@/lib/cryptoService";
import { snapshotBeforeDestructive } from "@/lib/autoBackup";
import { genId } from "@/lib/genId";

/* ── Storage Keys ── */
const NOTES_KEY = "pt_local_notes";
const THERAPISTS_KEY = "pt_local_therapists";
const SESSION_KEY = "pt_local_session";

const DEFAULT_MASTER_PW = "0000";

/* ── 임포트 시 문자열 필드 sanitize ── */
const MAX_FIELD_LENGTH = 20_000;

function sanitizeString(val: unknown): string {
  if (typeof val !== "string") return "";
  return val
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .slice(0, MAX_FIELD_LENGTH);
}

function sanitizeNote(note: NoteData): NoteData {
  return {
    ...note,
    patientName: sanitizeString(note.patientName),
    chartNo: sanitizeString(note.chartNo),
    birthDate: sanitizeString(note.birthDate),
    gender: sanitizeString(note.gender),
    diagnosis: sanitizeString(note.diagnosis),
    pmh: sanitizeString(note.pmh),
    chiefComplaint: sanitizeString(note.chiefComplaint),
    postural: sanitizeString(note.postural),
    palpation: sanitizeString(note.palpation),
    specialTest: sanitizeString(note.specialTest),
    treatment: sanitizeString(note.treatment),
    homeExercise: sanitizeString(note.homeExercise),
    noteDate: sanitizeString(note.noteDate),
  };
}

/* ══════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════ */

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

/** 환자 노트를 AES-GCM 암호화해서 저장 */
async function writeNotes(notes: NoteData[]): Promise<void> {
  if (typeof window === "undefined") return;
  const encrypted = await encryptData(JSON.stringify(notes));
  window.localStorage.setItem(NOTES_KEY, encrypted);
}

/**
 * 복호화/파싱이 모두 실패한 원본을 별도 키에 격리 보관.
 * readNotes 가 빈 배열을 반환한 뒤 사용자가 노트를 저장하면 NOTES_KEY 가
 * 덮어써지므로, 격리해 두지 않으면 원본이 영구 소실됨 (암호화 키 손상 대비).
 */
function quarantineCorruptNotes(raw: string): void {
  try {
    window.localStorage.setItem(`${NOTES_KEY}_corrupt_${Date.now()}`, raw);
    console.error(
      `[localDataService] 노트 복호화 실패 — 원본을 "${NOTES_KEY}_corrupt_*" 키에 보관했습니다.`
    );
  } catch {
    /* 격리 보관 실패 (쿼터 초과 등) — 앱 동작은 계속 */
  }
}

/**
 * 환자 노트 복호화 읽기.
 * 기존 평문 데이터(마이그레이션 전)는 JSON 폴백으로 자동 처리.
 * 복호화·파싱 모두 실패 시 원본을 격리 보관 후 빈 배열 반환.
 */
async function readNotes(): Promise<NoteData[]> {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(NOTES_KEY);
  if (!raw) return [];
  try {
    const decrypted = await decryptData(raw);
    return JSON.parse(decrypted) as NoteData[];
  } catch {
    // 암호화 전 평문 데이터 폴백 (최초 1회 마이그레이션)
    try {
      const plain = JSON.parse(raw);
      if (Array.isArray(plain)) {
        await writeNotes(plain as NoteData[]); // 즉시 암호화로 업그레이드
        return plain as NoteData[];
      }
    } catch {
      /* 아래 격리 처리로 진행 */
    }
    quarantineCorruptNotes(raw);
    return [];
  }
}

async function ensureBootstrapMaster(): Promise<void> {
  // 항상 실제 localStorage 를 확인. (모듈 캐시 사용 X — 외부에서
  // localStorage 가 비워지는 경우에도 안전하게 마스터 재생성)
  const therapists = read<TherapistRecord[]>(THERAPISTS_KEY, []);
  if (therapists.length > 0) return;

  const masterPwHash = await hashPassword(DEFAULT_MASTER_PW);
  const master: TherapistRecord = {
    uid: "master-default",
    id: "master",
    name: "마스터",
    passwordHash: masterPwHash,
    role: "master",
    resigned: false,
  };
  write(THERAPISTS_KEY, [master]);
}

/* ══════════════════════════════════════════
   Auth
   ══════════════════════════════════════════ */

export async function signIn(
  loginId: string,
  password: string
): Promise<{ therapist: Therapist }> {
  await ensureBootstrapMaster();
  const therapists = read<TherapistRecord[]>(THERAPISTS_KEY, []);
  const found = therapists.find((t) => t.id === loginId);

  if (!found) throw new Error("ID 또는 비밀번호를 확인해주세요.");
  if (found.resigned) throw new Error("퇴사 처리된 계정입니다.");

  const valid = await verifyPassword(password, found.passwordHash);
  if (!valid) throw new Error("ID 또는 비밀번호를 확인해주세요.");

  // 레거시 SHA-256 해시를 PBKDF2 로 자동 업그레이드
  if (isLegacyHash(found.passwordHash)) {
    const newHash = await hashPassword(password);
    write(
      THERAPISTS_KEY,
      therapists.map((t) => (t.uid === found.uid ? { ...t, passwordHash: newHash } : t))
    );
  }

  const session: Therapist = {
    uid: found.uid,
    id: found.id,
    name: found.name,
    role: found.role,
  };
  write(SESSION_KEY, session);
  return { therapist: session };
}

export async function signOut(): Promise<void> {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

type AuthSubscription = { unsubscribe: () => void };

export function onAuthStateChange(
  callback: (therapist: Therapist | null) => void
): { data: { subscription: AuthSubscription } } {
  // 페이지 로드 시 저장된 세션 복원
  void ensureBootstrapMaster().then(() => {
    const session = read<Therapist | null>(SESSION_KEY, null);
    callback(session);
  });

  return {
    data: {
      subscription: { unsubscribe: () => {} },
    },
  };
}

export async function reauthenticate(
  loginId: string,
  password: string
): Promise<boolean> {
  const therapists = read<TherapistRecord[]>(THERAPISTS_KEY, []);
  const found = therapists.find((t) => t.id === loginId);
  if (!found) return false;
  return verifyPassword(password, found.passwordHash);
}

/* ══════════════════════════════════════════
   Notes CRUD
   ══════════════════════════════════════════ */

/**
 * painAreas 형식 정규화.
 * 신규 형식: Record<string, number> (부위명 → 1|2|3). BodyDiagram 과 공유.
 * 구버전 형식 마이그레이션:
 *   - PainEntry[] ({view, region, painLevel}): region 기준으로 병합 → Record. view 는 버림
 *     (신규 컴포넌트는 부위명이 좌/우를 포함하고 view 를 식별에 쓰지 않음).
 *   - string[] (v0.1.3 이전 부위 ID 배열): 호환 변환 불가 → 비움.
 */
function sanitizePainAreas(note: NoteData): NoteData {
  const pa = note.painAreas as unknown;

  // 신규 형식 (Record<string, number>) — 값 범위(1~3)만 검증
  if (pa && typeof pa === "object" && !Array.isArray(pa)) {
    const clean: Record<string, number> = {};
    for (const [region, level] of Object.entries(pa as Record<string, unknown>)) {
      if (typeof level === "number" && level >= 1 && level <= 3) clean[region] = level;
    }
    return { ...note, painAreas: clean };
  }

  // 구버전 PainEntry[] → Record<string, number>
  if (Array.isArray(pa)) {
    const rec: Record<string, number> = {};
    for (const item of pa) {
      if (item && typeof item === "object" && "region" in item && "painLevel" in item) {
        const region = (item as { region?: unknown }).region;
        const level = (item as { painLevel?: unknown }).painLevel;
        if (typeof region === "string" && typeof level === "number" && level >= 1 && level <= 3) {
          rec[region] = level;
        }
      }
      // string[] 등 그 외 형식은 변환 불가 → 무시
    }
    return { ...note, painAreas: rec };
  }

  // null/undefined 등
  return { ...note, painAreas: {} };
}

export async function fetchNotes(): Promise<NoteData[]> {
  return (await readNotes())
    .map(sanitizePainAreas)
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
}

export async function upsertNote(note: NoteData): Promise<NoteData> {
  const session = read<Therapist | null>(SESSION_KEY, null);
  const enriched: NoteData = {
    ...note,
    therapist: note.therapist ?? session ?? undefined,
    therapistUid: note.therapistUid || session?.uid || "",
  };

  const notes = await readNotes();
  const idx = notes.findIndex((n) => n.id === enriched.id);
  if (idx >= 0) notes[idx] = enriched;
  else notes.unshift(enriched);
  await writeNotes(notes);
  return enriched;
}

export async function deleteNotes(ids: string[]): Promise<void> {
  const notes = await readNotes();
  await snapshotBeforeDestructive("before-delete", notes);
  await writeNotes(notes.filter((n) => !ids.includes(n.id)));
}

export async function transferNotesRpc(
  fromUid: string,
  toUid: string,
  toName: string,
  toLoginId: string | null
): Promise<number> {
  const notes = await readNotes();
  let count = 0;
  const updated = notes.map((n) => {
    if (n.therapistUid === fromUid) {
      count++;
      return {
        ...n,
        therapistUid: toUid,
        therapist: {
          uid: toUid,
          id: toLoginId,
          name: toName,
          role: "therapist" as const,
        },
      };
    }
    return n;
  });
  await writeNotes(updated);
  return count;
}

/* ══════════════════════════════════════════
   Therapists CRUD
   ══════════════════════════════════════════ */

export async function fetchTherapists(): Promise<TherapistRecord[]> {
  await ensureBootstrapMaster();
  return read<TherapistRecord[]>(THERAPISTS_KEY, []);
}

export async function createTherapistViaEdgeFunction(
  loginId: string,
  name: string,
  password: string
): Promise<TherapistRecord> {
  if (!/^PT-\d{3}$/.test(loginId)) {
    throw new Error("ID 형식이 올바르지 않습니다 (PT-001 ~ PT-999).");
  }

  const therapists = read<TherapistRecord[]>(THERAPISTS_KEY, []);
  if (therapists.some((t) => t.id === loginId && !t.resigned)) {
    throw new Error("이미 사용 중인 ID입니다.");
  }

  const passwordHash = await hashPassword(password);
  const newRecord: TherapistRecord = {
    uid: `therapist-${genId()}`,
    id: loginId,
    name,
    passwordHash,
    role: "therapist",
    resigned: false,
  };

  write(THERAPISTS_KEY, [...therapists, newRecord]);
  return newRecord;
}

export async function resignTherapistDb(uid: string): Promise<void> {
  const therapists = read<TherapistRecord[]>(THERAPISTS_KEY, []);
  write(
    THERAPISTS_KEY,
    therapists.map((t) => (t.uid === uid ? { ...t, id: null, resigned: true } : t))
  );
}

/**
 * 퇴사 처리된 치료사 레코드를 영구 삭제.
 * 이미 작성된 노트의 therapist 스냅샷은 그대로 유지되어 표시에 영향 없음.
 * 마스터 계정은 삭제 불가 (방어 로직).
 */
export async function deleteTherapistDb(uid: string): Promise<void> {
  const therapists = read<TherapistRecord[]>(THERAPISTS_KEY, []);
  const target = therapists.find((t) => t.uid === uid);
  if (!target) throw new Error("해당 치료사를 찾을 수 없습니다.");
  if (target.role === "master") throw new Error("마스터 계정은 삭제할 수 없습니다.");
  if (!target.resigned) throw new Error("퇴사 처리된 치료사만 삭제할 수 있습니다.");
  write(THERAPISTS_KEY, therapists.filter((t) => t.uid !== uid));
}

export async function updateTherapistPasswordViaAuth(
  newPassword: string
): Promise<void> {
  const session = read<Therapist | null>(SESSION_KEY, null);
  if (!session) throw new Error("로그인 세션이 없습니다.");

  const therapists = read<TherapistRecord[]>(THERAPISTS_KEY, []);
  const passwordHash = await hashPassword(newPassword);
  write(
    THERAPISTS_KEY,
    therapists.map((t) => (t.uid === session.uid ? { ...t, passwordHash } : t))
  );
}

/* ══════════════════════════════════════════
   Export / Import
   ══════════════════════════════════════════ */

/** 내보내기: 노트를 복호화한 평문 JSON 반환 */
export async function exportAllData(): Promise<string> {
  const notes = await readNotes(); // 복호화된 평문
  const therapists = read<TherapistRecord[]>(THERAPISTS_KEY, []);
  return JSON.stringify(
    { version: 2, exportedAt: new Date().toISOString(), notes, therapists },
    null,
    2
  );
}

export async function importNotes(notes: NoteData[]): Promise<number> {
  if (notes.length === 0) return 0;
  const existing = await readNotes();
  await snapshotBeforeDestructive("before-import", existing);
  const existingIds = new Set(existing.map((n) => n.id));
  const newOnes = notes
    .filter((n) => !existingIds.has(n.id))
    .map(sanitizeNote); // Fix #10: 임포트 시 sanitize
  if (newOnes.length === 0) return 0;
  await writeNotes([...newOnes, ...existing]);
  return newOnes.length;
}

/**
 * 백업 파일의 치료사 목록 복원 (기기 이전용).
 * - uid 가 이미 존재하면 스킵 (중복 방지)
 * - 마스터 계정은 기기별 1개 유지 — 백업의 마스터는 스킵
 * - 활성 치료사와 로그인 ID 가 충돌하면 스킵
 * - passwordHash 를 그대로 복원하므로 새 기기에서 기존 비밀번호로 로그인 가능
 */
export async function importTherapists(records: TherapistRecord[]): Promise<number> {
  if (!Array.isArray(records) || records.length === 0) return 0;
  await ensureBootstrapMaster();
  const existing = read<TherapistRecord[]>(THERAPISTS_KEY, []);
  const existingUids = new Set(existing.map((t) => t.uid));
  const activeIds = new Set(
    existing.filter((t) => !t.resigned && t.id).map((t) => t.id as string)
  );

  const newOnes: TherapistRecord[] = records
    .filter(
      (r) =>
        !!r &&
        typeof r === "object" &&
        typeof r.uid === "string" &&
        r.uid.length > 0 &&
        typeof r.name === "string" &&
        typeof r.passwordHash === "string" &&
        r.role === "therapist" &&
        !existingUids.has(r.uid) &&
        !(typeof r.id === "string" && activeIds.has(r.id))
    )
    .map((r) => ({
      uid: r.uid,
      id: typeof r.id === "string" ? r.id : null,
      name: r.name,
      passwordHash: r.passwordHash,
      role: "therapist" as const,
      resigned: r.resigned === true,
    }));

  if (newOnes.length === 0) return 0;
  write(THERAPISTS_KEY, [...existing, ...newOnes]);
  return newOnes.length;
}
