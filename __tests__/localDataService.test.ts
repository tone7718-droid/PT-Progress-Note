import { describe, it, expect, beforeEach } from "vitest";
import * as ds from "@/lib/localDataService";
import type { NoteData } from "@/types";

const sampleNote = (overrides: Partial<NoteData> = {}): NoteData => ({
  id: `note-${Math.random().toString(36).slice(2, 9)}`,
  savedAt: new Date().toISOString(),
  patientName: "홍길동",
  chartNo: "0001",
  birthDate: "1990-01-01",
  gender: "M",
  diagnosis: "",
  pmh: "",
  painScore: null,
  painAreas: {},
  chiefComplaint: "",
  rom: [],
  postural: "",
  palpation: "",
  specialTest: "",
  treatment: "",
  homeExercise: "",
  noteDate: "2026-04-28",
  therapist: null,
  therapistUid: "",
  ...overrides,
});

beforeEach(() => {
  // 각 테스트마다 깨끗한 localStorage 로 시작
  window.localStorage.clear();
});

describe("localDataService — auth", () => {
  it("first signIn bootstraps default master account (master / 0000)", async () => {
    const result = await ds.signIn("master", "0000");
    expect(result.therapist.role).toBe("master");
    expect(result.therapist.id).toBe("master");
  });

  it("signIn rejects wrong password with friendly message", async () => {
    await expect(ds.signIn("master", "wrong")).rejects.toThrow(
      /ID 또는 비밀번호/
    );
  });

  it("signIn rejects unknown ID", async () => {
    await expect(ds.signIn("nobody", "0000")).rejects.toThrow(
      /ID 또는 비밀번호/
    );
  });

  it("reauthenticate succeeds with correct password", async () => {
    await ds.signIn("master", "0000"); // bootstrap master
    expect(await ds.reauthenticate("master", "0000")).toBe(true);
    expect(await ds.reauthenticate("master", "wrong")).toBe(false);
  });
});

describe("localDataService — notes CRUD", () => {
  it("upsertNote inserts new note and fetchNotes returns it", async () => {
    const note = sampleNote({ patientName: "김환자", id: "n1" });
    await ds.upsertNote(note);

    const all = await ds.fetchNotes();
    expect(all).toHaveLength(1);
    expect(all[0].patientName).toBe("김환자");
    expect(all[0].id).toBe("n1");
  });

  it("upsertNote updates existing note in place (not duplicate)", async () => {
    await ds.upsertNote(sampleNote({ id: "n1", patientName: "원래" }));
    await ds.upsertNote(sampleNote({ id: "n1", patientName: "수정됨" }));

    const all = await ds.fetchNotes();
    expect(all).toHaveLength(1);
    expect(all[0].patientName).toBe("수정됨");
  });

  it("fetchNotes sorts by savedAt descending (newest first)", async () => {
    await ds.upsertNote(
      sampleNote({ id: "old", savedAt: "2026-01-01T00:00:00Z" })
    );
    await ds.upsertNote(
      sampleNote({ id: "mid", savedAt: "2026-03-01T00:00:00Z" })
    );
    await ds.upsertNote(
      sampleNote({ id: "new", savedAt: "2026-06-01T00:00:00Z" })
    );

    const all = await ds.fetchNotes();
    expect(all.map((n) => n.id)).toEqual(["new", "mid", "old"]);
  });

  it("deleteNotes removes specified ids only", async () => {
    await ds.upsertNote(sampleNote({ id: "a" }));
    await ds.upsertNote(sampleNote({ id: "b" }));
    await ds.upsertNote(sampleNote({ id: "c" }));

    await ds.deleteNotes(["a", "c"]);

    const all = await ds.fetchNotes();
    expect(all.map((n) => n.id)).toEqual(["b"]);
  });

  it("deleteNotes is no-op for non-existent ids", async () => {
    await ds.upsertNote(sampleNote({ id: "a" }));
    await ds.deleteNotes(["does-not-exist"]);
    expect(await ds.fetchNotes()).toHaveLength(1);
  });
});

describe("localDataService — painAreas migration", () => {
  it("migrates legacy PainEntry[] to Record<string, number> on fetch", async () => {
    const legacyPainAreas = [
      { view: "anterior", region: "우측 대흉근", painLevel: 2 },
      { view: "posterior", region: "좌측 광배근", painLevel: 3 },
    ];
    // 구버전 형식을 강제로 주입 (현재 타입은 Record 라 캐스팅)
    await ds.upsertNote(sampleNote({ id: "legacy", painAreas: legacyPainAreas as never }));

    const all = await ds.fetchNotes();
    const note = all.find((n) => n.id === "legacy")!;
    expect(note.painAreas).toEqual({ "우측 대흉근": 2, "좌측 광배근": 3 });
  });

  it("clears unconvertible legacy string[] painAreas", async () => {
    await ds.upsertNote(sampleNote({ id: "veryold", painAreas: ["head", "neck"] as never }));
    const all = await ds.fetchNotes();
    expect(all.find((n) => n.id === "veryold")!.painAreas).toEqual({});
  });

  it("drops out-of-range pain levels from Record form", async () => {
    await ds.upsertNote(
      sampleNote({ id: "rec", painAreas: { "우측 어깨": 2, "좌측 무릎": 9, "허리": 0 } as never })
    );
    const all = await ds.fetchNotes();
    expect(all.find((n) => n.id === "rec")!.painAreas).toEqual({ "우측 어깨": 2 });
  });
});

describe("localDataService — corrupt data safety", () => {
  it("quarantines undecryptable data instead of silently losing it on next save", async () => {
    // 암호화 키와 안 맞는 손상 데이터 (복호화 실패 + JSON 파싱 실패)
    window.localStorage.setItem("pt_local_notes", "corrupted-not-json{{{");

    const notes = await ds.fetchNotes();
    expect(notes).toEqual([]);

    // 원본이 격리 키에 보관되었는지
    const quarantineKeys = Object.keys(window.localStorage).filter((k) =>
      k.startsWith("pt_local_notes_corrupt_")
    );
    expect(quarantineKeys).toHaveLength(1);
    expect(window.localStorage.getItem(quarantineKeys[0])).toBe("corrupted-not-json{{{");

    // 이후 새 노트를 저장해도 격리본은 그대로 유지됨
    await ds.upsertNote(sampleNote({ id: "new-1" }));
    expect(window.localStorage.getItem(quarantineKeys[0])).toBe("corrupted-not-json{{{");
    expect(await ds.fetchNotes()).toHaveLength(1);
  });

  it("migrates legacy plaintext notes to encrypted storage", async () => {
    const legacy = [sampleNote({ id: "legacy-1", patientName: "평문환자" })];
    window.localStorage.setItem("pt_local_notes", JSON.stringify(legacy));

    const notes = await ds.fetchNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0].patientName).toBe("평문환자");

    // 읽는 순간 암호화로 업그레이드됨
    expect(window.localStorage.getItem("pt_local_notes")!).not.toContain("평문환자");
  });
});

describe("localDataService — therapist import", () => {
  const record = (uid: string, id: string | null, overrides = {}) => ({
    uid,
    id,
    name: `치료사-${uid}`,
    passwordHash: "pbkdf2v1:00:11",
    role: "therapist" as const,
    resigned: false,
    ...overrides,
  });

  it("imports new therapists and skips duplicates by uid", async () => {
    await ds.signIn("master", "0000"); // bootstrap
    expect(await ds.importTherapists([record("t1", "PT-001")])).toBe(1);
    // 같은 uid 재임포트 → 스킵
    expect(await ds.importTherapists([record("t1", "PT-001")])).toBe(0);

    const all = await ds.fetchTherapists();
    expect(all.filter((t) => t.role === "therapist")).toHaveLength(1);
  });

  it("skips master records and active login-id collisions", async () => {
    await ds.signIn("master", "0000");
    await ds.createTherapistViaEdgeFunction("PT-001", "기존", "1234");

    const imported = await ds.importTherapists([
      record("m2", "master2", { role: "master" as const }), // 마스터 → 스킵
      record("t2", "PT-001"), // 활성 ID 충돌 → 스킵
      record("t3", "PT-002"), // 정상
    ]);
    expect(imported).toBe(1);

    const all = await ds.fetchTherapists();
    expect(all.find((t) => t.uid === "t3")).toBeTruthy();
    expect(all.find((t) => t.uid === "t2")).toBeUndefined();
    expect(all.find((t) => t.uid === "m2")).toBeUndefined();
  });
});

describe("localDataService — note transfer", () => {
  it("transferNotesRpc reassigns notes from one therapist to another", async () => {
    await ds.upsertNote(
      sampleNote({ id: "n1", therapistUid: "uid-A" })
    );
    await ds.upsertNote(
      sampleNote({ id: "n2", therapistUid: "uid-A" })
    );
    await ds.upsertNote(
      sampleNote({ id: "n3", therapistUid: "uid-B" })
    );

    const count = await ds.transferNotesRpc("uid-A", "uid-B", "B-치료사", "PT-002");
    expect(count).toBe(2);

    const all = await ds.fetchNotes();
    const n1 = all.find((n) => n.id === "n1")!;
    const n3 = all.find((n) => n.id === "n3")!;
    expect(n1.therapistUid).toBe("uid-B");
    expect(n1.therapist?.name).toBe("B-치료사");
    expect(n3.therapistUid).toBe("uid-B"); // 기존 그대로
  });
});
