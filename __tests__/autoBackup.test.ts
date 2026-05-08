import { describe, it, expect, beforeEach } from "vitest";
import { snapshotBeforeDestructive, listBackups } from "@/lib/autoBackup";
import type { NoteData } from "@/types";

const KEY = "pt_auto_backup_v1";

const makeNote = (id: string, name: string): NoteData => ({
  id,
  savedAt: new Date().toISOString(),
  patientName: name,
  chartNo: "",
  birthDate: "",
  gender: null,
  diagnosis: "",
  pmh: "",
  painScore: null,
  painAreas: [],
  chiefComplaint: "",
  postural: "",
  palpation: "",
  specialTest: "",
  treatment: "",
  homeExercise: "",
  rom: [],
  noteDate: "",
  therapist: null,
  therapistUid: "",
});

beforeEach(() => {
  localStorage.removeItem(KEY);
});

describe("autoBackup", () => {
  it("does nothing when notes array is empty", () => {
    snapshotBeforeDestructive("before-delete", []);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("writes a snapshot before destructive action", () => {
    const notes = [makeNote("n1", "환자A"), makeNote("n2", "환자B")];
    snapshotBeforeDestructive("before-delete", notes);

    const list = listBackups();
    expect(list).toHaveLength(1);
    expect(list[0].reason).toBe("before-delete");
    expect(list[0].noteCount).toBe(2);
    expect(list[0].notes).toEqual(notes);
  });

  it("keeps a ring of last 5 snapshots", () => {
    for (let i = 0; i < 8; i++) {
      snapshotBeforeDestructive("before-import", [makeNote(`n${i}`, `환자${i}`)]);
    }
    const list = listBackups();
    expect(list).toHaveLength(5);
    // 가장 오래된 것이 버려졌는지 — 마지막 5개는 n3..n7
    expect(list[0].notes[0].id).toBe("n3");
    expect(list[4].notes[0].id).toBe("n7");
  });
});
