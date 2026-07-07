"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * 자동 세션 잠금 — 일정 시간(기본 30분) 사용자 입력이 없으면 자동 로그아웃.
 * 공용/공유 PC 에서 자리를 비운 사이 환자 기록이 열람되는 것을 줄이기 위한 장치.
 * 로그아웃되면 페이지 가드(app/page.tsx)가 로그인 화면을 다시 띄운다.
 *
 * 새 노트 작성 중이던 내용은 5초 주기 임시 저장(draft)으로 보존되지만,
 * 기존 노트 "수정 중" 내용은 저장 전이라면 사라질 수 있음 (README 에 명시).
 */

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30분
const CHECK_INTERVAL_MS = 30 * 1000;

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "pointerdown",
  "keydown",
  "touchstart",
  "wheel",
];

export default function AutoLock() {
  const therapist = useAuthStore((s) => s.therapist);
  const signOut = useAuthStore((s) => s.signOut);
  const lastActivityRef = useRef(0); // 실제 초기값은 아래 effect 에서 설정

  useEffect(() => {
    if (!therapist) return;

    lastActivityRef.current = Date.now();
    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };

    ACTIVITY_EVENTS.forEach((ev) =>
      window.addEventListener(ev, markActivity, { passive: true })
    );

    const interval = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current >= IDLE_TIMEOUT_MS) {
        void signOut();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, markActivity));
      window.clearInterval(interval);
    };
  }, [therapist, signOut]);

  return null;
}
