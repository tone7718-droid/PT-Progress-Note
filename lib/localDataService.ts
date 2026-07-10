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

import { NoteDataSchema, type NoteData, type TherapistRecord, type Therapist } from "@/types";
import { hashPassword, verifyPassword, isLegacyHash } from "@/components/hashUtils";
import {
  encryptData,
  decryptData,
  encryptWithPassphrase,
  decryptWithPassphrase,
  type PassphraseEncrypted,
} from "@/lib/cryptoService";
import { snapshotBeforeDestructive, listBackups, type BackupSnapshot } from "@/lib/autoBackup";
import { genId } from "@/lib/genId";
import { validateNewPassword } from "@/lib/passwordPolicy";

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
    // 따옴표가 뒤따르는 실제 인라인 이벤트 속성(onclick=" 등)만 제거.
    // 임상 문구("onset = 3일 전", "pronation = 80도")를 훼손하지 않도록 좁게 매칭.
    .replace(/\bon\w+\s*=\s*["']/gi, "")
    .slice(0, MAX_FIELD_LENGTH);
}

/** 구버전/외부 백업의 결측·형식 이탈 필드를 스키마 검증 전에 정규화.
    (정당한 옛 데이터가 zod 에서 통째로 거부되지 않도록) */
function normalizeNoteShape(note: NoteData): NoteData {
  const rawScore = note.painScore as unknown;
  const score =
    typeof rawScore === "number" ? rawScore : typeof rawScore === "string" ? Number(rawScore) : null;
  return {
    ...note,
    rom: Array.isArray(note.rom)
      ? note.rom.map((r) => ({
          joint: typeof r?.joint === "string" ? r.joint : "",
          measuredROM: typeof r?.measuredROM === "string" ? r.measuredROM : "",
          normalRange: typeof r?.normalRange === "string" ? r.normalRange : "",
        }))
      : [],
    painScore:
      typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 10
        ? score
        : null,
  };
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
   환자 식별자 (patientId)
   ══════════════════════════════════════════
   동명이인 구분을 위해 노트마다 내부 환자 ID를 부여한다.
   매칭 규칙: 차트번호 → 이름+생년월일 → (백필 한정) 이름 단독 → 신규 발급 */

/** pool 에서 동일 환자로 볼 수 있는 patientId 를 찾는다 (차트번호 → 이름+생년월일). 없으면 null. */
function findMatchingPatientId(note: NoteData, pool: NoteData[]): string | null {
  const chartNo = note.chartNo?.trim();
  if (chartNo) {
    const match = pool.find((n) => n.patientId && n.chartNo?.trim() === chartNo);
    if (match?.patientId) return match.patientId;
  }

  const name = note.patientName?.trim();
  const birth = note.birthDate?.trim();
  if (name && birth) {
    const match = pool.find(
      (n) => n.patientId && n.patientName?.trim() === name && n.birthDate?.trim() === birth
    );
    if (match?.patientId) return match.patientId;
  }

  return null;
}

function resolvePatientId(
  note: NoteData,
  pool: NoteData[],
  options: { allowNameOnly?: boolean } = {}
): string {
  if (note.patientId) return note.patientId;

  const matched = findMatchingPatientId(note, pool);
  if (matched) return matched;

  // 구데이터 백필용 이름 단독 매칭 — 동명이인 오병합을 막기 위해
  // "양쪽 모두 차트번호·생년월일이 전혀 없는" 완전히 구분 불가능한
  // 레코드끼리만 묶는다. (생년월일이 다른 동명이인은 절대 병합하지 않음)
  const name = note.patientName?.trim();
  const birth = note.birthDate?.trim();
  const chartNo = note.chartNo?.trim();
  if (options.allowNameOnly && name && !birth && !chartNo) {
    const match = pool.find(
      (n) =>
        n.patientId &&
        n.patientName?.trim() === name &&
        !n.birthDate?.trim() &&
        !n.chartNo?.trim()
    );
    if (match?.patientId) return match.patientId;
  }

  return `patient-${genId()}`;
}

/** patientId 가 없는 기존 노트에 백필. 모든 노트에 있으면 no-op (idempotent). */
async function ensurePatientIds(notes: NoteData[]): Promise<NoteData[]> {
  if (notes.length === 0 || notes.every((n) => n.patientId)) return notes;

  // 먼저 기록된 노트 기준으로 그룹핑되도록 savedAt 오름차순으로 부여
  const ordered = [...notes].sort(
    (a, b) => new Date(a.savedAt || 0).getTime() - new Date(b.savedAt || 0).getTime()
  );
  for (const note of ordered) {
    if (!note.patientId) {
      note.patientId = resolvePatientId(note, ordered, { allowNameOnly: true });
    }
  }
  await writeNotes(notes);
  return notes;
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
  const notes = await ensurePatientIds(await readNotes());
  return notes
    .map(sanitizePainAreas)
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
}

export async function upsertNote(note: NoteData): Promise<NoteData> {
  const session = read<Therapist | null>(SESSION_KEY, null);
  const notes = await ensurePatientIds(await readNotes());
  const enriched: NoteData = {
    ...note,
    // 같은 id 의 기존 노트가 있으면 그 patientId 를 재사용 — 차트번호·생년월일이
    // 비어 있는 노트를 재저장할 때마다 새 환자로 갈라지는 churn 방지
    patientId:
      note.patientId ||
      notes.find((n) => n.id === note.id)?.patientId ||
      resolvePatientId(note, notes),
    therapist: note.therapist ?? session ?? undefined,
    therapistUid: note.therapistUid || session?.uid || "",
  };

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

export async function createTherapist(
  loginId: string,
  name: string,
  password: string
): Promise<TherapistRecord> {
  if (!/^PT-\d{3}$/.test(loginId)) {
    throw new Error("ID 형식이 올바르지 않습니다 (PT-001 ~ PT-999).");
  }

  // 정책 방어 검증 — 등록/변경 경로 모두 동일 정책 (UI 우회 대비 단일 소스)
  const policyError = validateNewPassword(password);
  if (policyError) throw new Error(policyError);

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

/**
 * master 가 다른 치료사의 비밀번호를 재설정.
 * v3 백업에서 복원된 "비밀번호 미설정(로그인 잠금)" 계정을 활성화하는 유일한 경로.
 */
export async function resetTherapistPasswordDb(
  uid: string,
  newPassword: string
): Promise<void> {
  const session = read<Therapist | null>(SESSION_KEY, null);
  if (!session || session.role !== "master") {
    throw new Error("마스터 계정만 비밀번호를 재설정할 수 있습니다.");
  }

  const policyError = validateNewPassword(newPassword);
  if (policyError) throw new Error(policyError);

  const therapists = read<TherapistRecord[]>(THERAPISTS_KEY, []);
  const target = therapists.find((t) => t.uid === uid);
  if (!target) throw new Error("해당 치료사를 찾을 수 없습니다.");
  if (target.resigned) throw new Error("퇴사 처리된 계정은 재설정할 수 없습니다.");

  const passwordHash = await hashPassword(newPassword);
  write(
    THERAPISTS_KEY,
    therapists.map((t) => (t.uid === uid ? { ...t, passwordHash } : t))
  );
}

export async function updateTherapistPasswordViaAuth(
  newPassword: string
): Promise<void> {
  const session = read<Therapist | null>(SESSION_KEY, null);
  if (!session) throw new Error("로그인 세션이 없습니다.");

  // 정책 방어 검증 (UI 우회 대비 단일 소스) — 솔트 PBKDF2 로 저장
  const policyError = validateNewPassword(newPassword);
  if (policyError) throw new Error(policyError);

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

/**
 * 내보내기: 노트를 복호화한 평문 JSON 반환.
 * 보안: 비밀번호 해시는 파일에 포함하지 않는다 (백업 파일은 공유·유출되기 쉬움).
 * 해시 없이 복원된 치료사 계정은 로그인 불가 상태이며, master 가
 * "비밀번호 재설정"으로 활성화해야 한다 (v3 부터).
 */
export async function exportAllData(): Promise<string> {
  const notes = await readNotes(); // 복호화된 평문
  const therapists = read<TherapistRecord[]>(THERAPISTS_KEY, []).map((t) => ({
    ...t,
    passwordHash: "",
  }));
  return JSON.stringify(
    { version: 3, exportedAt: new Date().toISOString(), notes, therapists },
    null,
    2
  );
}

/* ── 암호화 백업 (passphrase) ── */

const ENCRYPTED_BACKUP_FORMAT = "ptnote-encrypted-v1";

interface EncryptedBackupEnvelope extends PassphraseEncrypted {
  app: string;
  format: typeof ENCRYPTED_BACKUP_FORMAT;
  exportedAt: string;
}

/** 내보내기(암호화): 백업 페이로드 전체를 passphrase 파생 키로 AES-GCM 암호화 */
export async function exportAllDataEncrypted(passphrase: string): Promise<string> {
  const plain = await exportAllData();
  const encrypted = await encryptWithPassphrase(plain, passphrase);
  const envelope: EncryptedBackupEnvelope = {
    app: "pt-progress-note",
    format: ENCRYPTED_BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    ...encrypted,
  };
  return JSON.stringify(envelope, null, 2);
}

/** 파일 내용이 암호화 백업(passphrase 필요)인지 판별 */
export function isEncryptedBackup(text: string): boolean {
  try {
    const parsed = JSON.parse(text);
    return !!parsed && parsed.format === ENCRYPTED_BACKUP_FORMAT;
  } catch {
    return false;
  }
}

/** 암호화 백업을 평문 백업 JSON 문자열로 복호화. passphrase 불일치 시 throw. */
export async function decryptBackupText(text: string, passphrase: string): Promise<string> {
  const envelope = JSON.parse(text) as EncryptedBackupEnvelope;
  if (envelope.format !== ENCRYPTED_BACKUP_FORMAT) {
    throw new Error("암호화 백업 형식이 아닙니다.");
  }
  try {
    return await decryptWithPassphrase(envelope, passphrase);
  } catch {
    throw new Error("백업 암호가 올바르지 않습니다.");
  }
}

export interface ImportNotesResult {
  added: number;
  skippedInvalid: number; // 스키마 검증 실패로 제외된 건수 (조용히 버리지 않고 보고)
}

export async function importNotes(notes: NoteData[]): Promise<ImportNotesResult> {
  if (!Array.isArray(notes) || notes.length === 0) return { added: 0, skippedInvalid: 0 };
  const existing = await readNotes();
  await snapshotBeforeDestructive("before-import", existing);
  const existingIds = new Set(existing.map((n) => n.id));

  let skippedInvalid = 0;
  const newOnes: NoteData[] = [];
  for (const raw of notes) {
    if (!raw || typeof raw !== "object") { skippedInvalid++; continue; }
    // 구버전 painAreas/rom/painScore 형식을 먼저 정규화한 뒤 스키마 검증
    const normalized = sanitizeNote(normalizeNoteShape(sanitizePainAreas(raw as NoteData)));
    const parsed = NoteDataSchema.safeParse(normalized);
    if (!parsed.success) { skippedInvalid++; continue; }
    if (existingIds.has(normalized.id)) continue; // 중복은 오류가 아님 — 조용히 스킵
    newOnes.push(normalized);
  }

  if (newOnes.length === 0) return { added: 0, skippedInvalid };

  // 기기 간 patientId 재조정 — 백업의 patientId 는 다른 기기에서 발급된
  // 값일 수 있으므로, 이 기기의 동일 환자(차트번호/이름+생년월일 매칭)가
  // 있으면 그 patientId 로 재매핑한다. 같은 수입 patientId 를 공유하던
  // 노트들은 재매핑 후에도 같은 그룹을 유지한다.
  const pidRemap = new Map<string, string>();
  for (const n of newOnes) {
    if (!n.patientId) continue;
    if (!pidRemap.has(n.patientId)) {
      const local = findMatchingPatientId(n, existing);
      pidRemap.set(n.patientId, local ?? n.patientId);
    }
    n.patientId = pidRemap.get(n.patientId);
  }

  // patientId 가 없는 노트에는 기존+가져오는 노트 전체를 기준으로 부여
  const pool = [...existing, ...newOnes];
  for (const n of newOnes) {
    if (!n.patientId) {
      n.patientId = resolvePatientId(n, pool, { allowNameOnly: true });
    }
  }

  await writeNotes([...newOnes, ...existing]);
  return { added: newOnes.length, skippedInvalid };
}

/* ── 자동 백업 복원 ── */

export async function listAutoBackups(): Promise<BackupSnapshot[]> {
  return listBackups();
}

/**
 * 자동 백업 스냅샷으로 전체 복원 (현재 노트를 스냅샷 내용으로 교체).
 * 복원 직전 현재 상태를 추가 스냅샷으로 남겨 복원 자체도 되돌릴 수 있게 한다.
 */
export async function restoreAutoBackup(at: string): Promise<number> {
  const snapshots = await listBackups();
  const target = snapshots.find((s) => s.at === at);
  if (!target) throw new Error("해당 백업을 찾을 수 없습니다.");

  const current = await readNotes();
  await snapshotBeforeDestructive("before-restore", current);
  await writeNotes(target.notes);
  return target.notes.length;
}

/**
 * 백업 파일의 치료사 목록 복원 (기기 이전용).
 * - uid 가 이미 존재하면 스킵 (중복 방지)
 * - 마스터 계정은 기기별 1개 유지 — 백업의 마스터는 스킵
 * - 활성 치료사와 로그인 ID 가 충돌하면 스킵
 * - v3 백업(해시 제거됨)의 계정은 passwordHash="" 로 복원됨 → 로그인 불가
 *   상태이며 master 의 "비밀번호 재설정"으로 활성화 (verifyPassword 는
 *   빈 해시를 항상 거부)
 * - v2 이하 구버전 백업의 해시는 그대로 복원 (하위 호환 — 기존 비밀번호 유지)
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
