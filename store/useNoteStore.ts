import { create } from "zustand";
import type { NoteData } from "@/types";
import * as ds from "@/lib/localDataService"; // 로컬 전환용
import type { BackupSnapshot } from "@/lib/autoBackup";
import { useAuthStore } from "./useAuthStore";
import { genId } from "@/lib/genId";

interface NoteStore {
  notes: NoteData[];
  selectedNoteId: string | null;
  isLoading: boolean;
  error: string | null;

  selectNote: (id: string | null) => void;
  createNewNote: () => void;
  refreshNotes: () => Promise<void>;
  saveNote: (data: Omit<NoteData, "id" | "savedAt">, existingId?: string | null) => Promise<NoteData>;
  deleteNotes: (ids: string[]) => Promise<void>;
  transferNotes: (fromUid: string, toUid: string, toName: string, toLoginId: string | null) => Promise<void>;
  exportData: () => Promise<string>;
  exportDataEncrypted: (passphrase: string) => Promise<string>;
  importData: (
    json: string,
    passphrase?: string
  ) => Promise<{ notesCount: number; therapistsCount: number; skippedCount: number }>;
  listBackups: () => Promise<BackupSnapshot[]>;
  restoreBackup: (at: string) => Promise<number>;
  initSync: () => void;
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  selectedNoteId: null,
  isLoading: false,
  error: null,

  selectNote: (id) => set({ selectedNoteId: id }),
  createNewNote: () => set({ selectedNoteId: null }),

  initSync: () => {
    // Auth 상태 리스너 등록 (cleanup은 앱 생명주기 동안 유지하므로 subscription 미보관)
    ds.onAuthStateChange(async (t) => {
      useAuthStore.getState().setTherapist(t);
      // 세션 복원 완료 — 초기 로딩 해제 (이후 노트 로딩은 이 스토어의 isLoading 이 담당)
      useAuthStore.getState().setLoading(false);
      if (t) {
        set({ isLoading: true });
        try {
          const [fetchedNotes, fetchedTherapists] = await Promise.all([
            ds.fetchNotes(),
            ds.fetchTherapists(),
          ]);
          set({ notes: fetchedNotes, error: null });
          useAuthStore.getState().setTherapists(fetchedTherapists);
        } catch (err) {
          console.error("[init] fetch after auth failed:", err);
          set({ error: (err as Error).message });
        } finally {
          set({ isLoading: false });
        }
      } else {
        set({ notes: [] });
        useAuthStore.getState().setTherapists([]);
      }
    });

    // Cleanup은 이 스토어 생명주기 동안 유지하므로 생략하거나 애플리케이션 종료시 처리
  },

  refreshNotes: async () => {
    try {
      const fetchedNotes = await ds.fetchNotes();
      set({ notes: fetchedNotes });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  saveNote: async (data, existingId) => {
    const now = new Date().toISOString();
    const noteToSave: NoteData = existingId
      ? { ...data, id: existingId, savedAt: now }
      : { ...data, id: `note-${genId()}`, savedAt: now };

    // Optimistic Update
    set((state) => {
      const updated = existingId
        ? state.notes.map((n) => (n.id === existingId ? noteToSave : n))
        : [noteToSave, ...state.notes];
      return {
        notes: updated.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()),
        selectedNoteId: noteToSave.id
      };
    });

    try {
      const saved = await ds.upsertNote(noteToSave);
      set((state) => ({
        notes: state.notes
          .map((n) => (n.id === saved.id ? saved : n))
          .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
      }));
      return saved;
    } catch (err) {
      // rollback
      get().refreshNotes();
      throw err;
    }
  },

  deleteNotes: async (ids) => {
    // 삭제 직전 스냅샷은 ds.deleteNotes 내부에서 1회 수행 (중복 방지)
    set((state) => ({
      notes: state.notes.filter((n) => !ids.includes(n.id)),
      selectedNoteId: state.selectedNoteId && ids.includes(state.selectedNoteId) ? null : state.selectedNoteId
    }));

    try {
      await ds.deleteNotes(ids);
    } catch (err) {
      get().refreshNotes();
      throw err;
    }
  },

  transferNotes: async (fromUid, toUid, toName, toLoginId) => {
    await ds.transferNotesRpc(fromUid, toUid, toName, toLoginId);
    set((state) => ({
      notes: state.notes.map((n) => {
        if (n.therapistUid === fromUid) {
          return {
            ...n,
            therapistUid: toUid,
            therapist: { uid: toUid, id: toLoginId, name: toName, role: "therapist" as const },
          };
        }
        return n;
      })
    }));
  },

  exportData: async () => {
    return ds.exportAllData();
  },

  exportDataEncrypted: async (passphrase) => {
    return ds.exportAllDataEncrypted(passphrase);
  },

  importData: async (json, passphrase) => {
    // 암호화 백업이면 먼저 passphrase 로 복호화해 평문 백업 JSON 을 얻는다
    const plainJson = ds.isEncryptedBackup(json)
      ? await ds.decryptBackupText(json, passphrase ?? "")
      : json;

    const data = JSON.parse(plainJson);
    if (!data.notes || !Array.isArray(data.notes)) throw new Error("잘못된 데이터 형식입니다.");

    // import 직전 스냅샷은 ds.importNotes 내부에서 1회 수행 (중복 방지)
    const { added: notesCount, skippedInvalid: skippedCount } = await ds.importNotes(data.notes);
    const therapistsCount = Array.isArray(data.therapists)
      ? await ds.importTherapists(data.therapists)
      : 0;

    const updatedNotes = await ds.fetchNotes();
    set({ notes: updatedNotes });
    if (therapistsCount > 0) {
      useAuthStore.getState().setTherapists(await ds.fetchTherapists());
    }

    return { notesCount, therapistsCount, skippedCount };
  },

  listBackups: async () => {
    return ds.listAutoBackups();
  },

  restoreBackup: async (at) => {
    const restored = await ds.restoreAutoBackup(at);
    set({ notes: await ds.fetchNotes(), selectedNoteId: null });
    return restored;
  },
}));
