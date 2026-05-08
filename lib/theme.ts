"use client";

/**
 * 테마 토글 — light / dark.
 * 저장 위치: localStorage["pt-theme"], html.dark 클래스로 적용.
 *
 * FOUC 방지 인라인 스크립트는 lib/themeScript.ts 에 분리되어 layout.tsx 에서 import 됨
 * — 서버 컴포넌트가 hook 모듈을 import 하지 않도록 의도적으로 나눠 둠.
 */

import { useSyncExternalStore } from "react";
import { THEME_KEY } from "./themeScript";

export type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    return window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", t === "dark");
}

const THEME_EVENT = "pt-theme-changed";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(THEME_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(THEME_EVENT, cb);
  };
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    readTheme,
    () => "light" as const, // SSR fallback — inline script 가 클라이언트에서 .dark 를 미리 붙이므로 OK
  );

  const setTheme = (t: Theme) => {
    applyTheme(t);
    try {
      window.localStorage.setItem(THEME_KEY, t);
    } catch {
      // 쿼터 초과 등 — 무시
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return { theme, setTheme, toggle };
}
