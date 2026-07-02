/** 고유 ID 생성 — crypto.randomUUID 우선, 미지원 환경(비보안 컨텍스트 등)은 폴백 */
export function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
