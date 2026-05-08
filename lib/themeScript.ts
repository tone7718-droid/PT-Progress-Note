/**
 * FOUC 방지 인라인 스크립트 — layout.tsx (서버 컴포넌트) 가 그대로 직렬화함.
 *
 * lib/theme.ts 와 분리한 이유: theme.ts 는 useSyncExternalStore 를 쓰는
 * 클라이언트 훅을 담고 있어 RSC 트리에서 import 하면 빌드 에러가 난다.
 * 이 파일은 React import 가 전혀 없는 순수 상수 모듈.
 */

export const THEME_KEY = "pt-theme";

export const THEME_INIT_SCRIPT = `(() => {
  try {
    var t = localStorage.getItem("${THEME_KEY}");
    if (t === "dark") document.documentElement.classList.add("dark");
  } catch (_) {}
})();`;
