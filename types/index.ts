export interface TherapistRecord {
  uid: string;
  id: string | null;
  name: string;
  passwordHash: string; // Supabase Auth에서 관리
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
  patientName: "", chartNo: "", birthDate: "", gender: "", diagnosis: "", pmh: "",
  painScore: null, painAreas: {}, chiefComplaint: "", rom: [],
  postural: "", palpation: "", specialTest: "", treatment: "", homeExercise: "",
  noteDate: "", therapist: null, therapistUid: "",
};
