import { z } from "zod";

export interface TherapistRecord {
  uid: string;
  id: string | null;
  name: string;
  passwordHash: string; // PBKDF2 해시 (components/hashUtils). 빈 문자열 = 비밀번호 미설정(로그인 잠금)
  role: "therapist" | "master";
  resigned: boolean;
}

export interface Therapist {
  uid: string;
  id: string | null;
  name: string;
  role: "therapist" | "master";
}

/** 통증 부위 마킹: 부위명 → 통증 강도 (1=경도, 2=중등도, 3=중증). BodyDiagram 과 형식 공유. */
export type PainAreas = Record<string, number>;

export interface NoteData {
  id: string;
  savedAt: string;
  patientId?: string; // 내부 환자 식별자 (동명이인 구분용, 저장 시 자동 부여)
  patientName: string;
  chartNo: string;
  birthDate: string;
  gender: string;
  diagnosis: string;
  pmh: string;
  painScore: number | null;
  painAreas: PainAreas;
  chiefComplaint: string;
  rom: { joint: string; measuredROM: string; normalRange: string }[];
  postural: string;
  palpation: string;
  specialTest: string;
  treatment: string;
  homeExercise: string;
  noteDate: string;
  therapist?: Therapist | null;
  therapistUid?: string;
}

export const EMPTY_NOTE: Omit<NoteData, "id" | "savedAt"> = {
  patientId: "", patientName: "", chartNo: "", birthDate: "", gender: "", diagnosis: "", pmh: "",
  painScore: null, painAreas: {}, chiefComplaint: "", rom: [],
  postural: "", palpation: "", specialTest: "", treatment: "", homeExercise: "",
  noteDate: "", therapist: null, therapistUid: "",
};

/* ── 런타임 스키마 (백업 가져오기 검증용) ──
 * 외부 파일에서 들어오는 노트가 앱이 기대하는 구조인지 검증한다.
 * painAreas 는 구버전 형식(PainEntry[] 등)이 존재하므로,
 * localDataService 의 정규화(sanitizePainAreas)를 거친 뒤 검증할 것. */

export const TherapistSchema = z.object({
  uid: z.string(),
  id: z.string().nullable(),
  name: z.string(),
  role: z.enum(["therapist", "master"]),
});

export const NoteDataSchema = z.object({
  id: z.string().min(1),
  savedAt: z.string().min(1),
  patientId: z.string().optional(),
  patientName: z.string(),
  chartNo: z.string(),
  birthDate: z.string(),
  gender: z.string(),
  diagnosis: z.string(),
  pmh: z.string(),
  painScore: z.number().min(0).max(10).nullish(),
  painAreas: z.record(z.string(), z.number().int().min(1).max(3)),
  chiefComplaint: z.string(),
  rom: z.array(
    z.object({
      joint: z.string(),
      measuredROM: z.string(),
      normalRange: z.string(),
    })
  ),
  postural: z.string(),
  palpation: z.string(),
  specialTest: z.string(),
  treatment: z.string(),
  homeExercise: z.string(),
  noteDate: z.string(),
  therapist: TherapistSchema.nullish(),
  therapistUid: z.string().optional(),
});
