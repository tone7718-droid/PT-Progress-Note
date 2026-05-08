/**
 * 조용한 자동 백업 — 파괴적 작업(삭제 / import) 직전에 현재 노트 전체를
 * localStorage 링버퍼에 스냅샷으로 남긴다. 사용자에게는 노출하지 않음.
 *
 * 사용자 보호: "방금 삭제했는데 잘못 눌렀다" 같은 사고 시 복원 단서를 남기는 게 목적.
 * UI 메뉴는 의도적으로 두지 않음 (이전 버전에서 제거됨). 복원이 필요하면 콘솔에서
 * `JSON.parse(localStorage["pt_auto_backup_v1"])` 로 직접 꺼내 쓰는 식.
 *
 * 저장 키: localStorage["pt_auto_backup_v1"]
 * 형식:    { snapshots: BackupSnapshot[] } — 최신이 배열 끝.
 * 보관:    최근 MAX_SNAPSHOTS 개만 유지. 쿼터 초과 시 가장 오래된 것부터 비우며 재시도.
 */

import type { NoteData } from "@/types";

const KEY = "pt_auto_backup_v1";
const MAX_SNAPSHOTS = 5;

export type BackupReason = "before-delete" | "before-import";

export interface BackupSnapshot {
  at: string;          // ISO timestamp
  reason: BackupReason;
  noteCount: number;
  notes: NoteData[];
}

interface BackupStore {
  snapshots: BackupSnapshot[];
}

function readStore(): BackupStore {
  if (typeof window === "undefined") return { snapshots: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { snapshots: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.snapshots)) return { snapshots: [] };
    return parsed as BackupStore;
  } catch {
    return { snapshots: [] };
  }
}

function writeStore(store: BackupStore): boolean {
  if (typeof window === "undefined") return false;
  /* 쿼터 초과 시 오래된 스냅샷부터 1개씩 버려가며 재시도. 최후 1개도 못 넣으면 포기. */
  let attempt = { ...store, snapshots: [...store.snapshots] };
  for (let i = 0; i < MAX_SNAPSHOTS; i++) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(attempt));
      return true;
    } catch {
      if (attempt.snapshots.length <= 1) return false;
      attempt = { snapshots: attempt.snapshots.slice(1) };
    }
  }
  return false;
}

/** 파괴적 작업 직전 호출. 실패해도 throw 안 함 — 조용한 보험이 목적. */
export function snapshotBeforeDestructive(reason: BackupReason, notes: NoteData[]): void {
  if (typeof window === "undefined") return;
  if (!Array.isArray(notes) || notes.length === 0) return; // 비어 있으면 의미 없음

  const snap: BackupSnapshot = {
    at: new Date().toISOString(),
    reason,
    noteCount: notes.length,
    notes,
  };
  const store = readStore();
  const next = [...store.snapshots, snap].slice(-MAX_SNAPSHOTS);
  writeStore({ snapshots: next });
}

/** 콘솔 디버깅 / 향후 복원 UI 추가 시 사용. */
export function listBackups(): BackupSnapshot[] {
  return readStore().snapshots;
}
