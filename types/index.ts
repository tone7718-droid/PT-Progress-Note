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
  painAreas: string[];
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
  painScore: null, painAreas: [], chiefComplaint: "", rom: [],
  postural: "", palpation: "", specialTest: "", treatment: "", homeExercise: "",
  noteDate: "", therapist: null, therapistUid: "",
};
