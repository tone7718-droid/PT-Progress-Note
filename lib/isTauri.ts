/**
 * Tauri 런타임 감지 유틸리티.
 * - 웹 브라우저(Vercel)에서는 false → 업데이터 UI가 렌더되지 않음
 * - Tauri 데스크톱 앱에서는 true → 업데이터 UI 표시
 *
 * Tauri v2는 window에 `__TAURI_INTERNALS__`를 주입하므로 이를 검사.
 */
export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window;
}
