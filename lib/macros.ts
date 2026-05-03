/**
 * 텍스트 입력창에서 사용할 매크로(자동 완성) 저장소.
 * 현재는 "도수치료" 카테고리만 — 슬롯 1~20.
 *
 * 트리거 패턴: /도수 또는 /도수\d+
 * 저장 위치: localStorage["pt_macros_dosu"] (배열, 인덱스 0~19 = 슬롯 1~20)
 */

const MACROS_KEY = "pt_macros_dosu";
export const MACRO_TRIGGER = "/도수";
export const MACRO_SLOT_COUNT = 20;

export type MacroSlot = string; // 빈 문자열 = 미설정

export function loadMacros(): MacroSlot[] {
  if (typeof window === "undefined") return Array(MACRO_SLOT_COUNT).fill("");
  try {
    const raw = window.localStorage.getItem(MACROS_KEY);
    if (!raw) return Array(MACRO_SLOT_COUNT).fill("");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return Array(MACRO_SLOT_COUNT).fill("");
    const slots = parsed.slice(0, MACRO_SLOT_COUNT).map((v) => (typeof v === "string" ? v : ""));
    while (slots.length < MACRO_SLOT_COUNT) slots.push("");
    return slots;
  } catch {
    return Array(MACRO_SLOT_COUNT).fill("");
  }
}

export function saveMacros(macros: MacroSlot[]): void {
  if (typeof window === "undefined") return;
  const trimmed = macros.slice(0, MACRO_SLOT_COUNT).map((v) => (typeof v === "string" ? v : ""));
  while (trimmed.length < MACRO_SLOT_COUNT) trimmed.push("");
  window.localStorage.setItem(MACROS_KEY, JSON.stringify(trimmed));
}

/**
 * 입력 텍스트의 커서 위치에서 트리거 패턴 검색.
 * 반환: 매칭된 시작 인덱스, 끝 인덱스, 슬롯 번호(있으면) — 없으면 null.
 *
 * 예: text = "치료 내용: /도수3 적용", cursor = 14 (3 뒤)
 *  → { start: 7, end: 14, slot: 3 }
 */
export function detectMacroTrigger(text: string, cursor: number): { start: number; end: number; slot: number | null } | null {
  // 커서 직전 토큰 추출 (공백 / 줄바꿈으로 끊김)
  let i = cursor - 1;
  while (i >= 0 && !/[\s]/.test(text[i])) i--;
  const start = i + 1;
  const token = text.slice(start, cursor);
  // /도수 + 선택적 숫자
  const m = /^\/도수(\d{1,2})?$/.exec(token);
  if (!m) return null;
  const slot = m[1] ? parseInt(m[1], 10) : null;
  // 슬롯 범위 검증: 1~20 만 유효 — 그 외 숫자면 매칭 실패
  if (slot !== null && (slot < 1 || slot > MACRO_SLOT_COUNT)) return null;
  return { start, end: cursor, slot };
}
