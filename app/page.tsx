"use client";

import Sidebar from "@/components/Sidebar";
import ProgressNoteForm from "@/components/ProgressNoteForm";
import LoginModal from "@/components/LoginModal";
import UpdateChecker from "@/components/UpdateChecker";
import { useEffect, useState } from "react";
import { Menu, X, Moon, Sun } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useNoteStore } from "@/store/useNoteStore";
import { useTheme } from "@/lib/theme";

function HomeContent() {
  const therapist = useAuthStore((s) => s.therapist);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const isNoteLoading = useNoteStore((s) => s.isLoading);
  const isLoading = isAuthLoading || isNoteLoading;
  const initSync = useNoteStore((s) => s.initSync);
  const checkLocalData = useNoteStore((s) => s.checkLocalData);

  // 모바일 사이드바 (drawer) 토글
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    checkLocalData();
    initSync();
  }, [checkLocalData, initSync]);

  /* 모바일에서 노트 선택이 바뀌면 drawer 자동 닫음 (목록 → 노트 보기 전환).
     useEffect+의존성 대신 zustand subscribe 를 쓰는 이유: lint 의
     react-hooks/set-state-in-effect 가 동기 setState 를 막기 때문. 외부
     store 변화에 반응하는 콜백 안에서의 setState 는 정당한 사용 패턴. */
  useEffect(() => {
    return useNoteStore.subscribe((state, prev) => {
      if (state.selectedNoteId !== prev.selectedNoteId) {
        setMobileSidebarOpen(false);
      }
    });
  }, []);

  // drawer 열린 동안 배경 스크롤 잠금
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [mobileSidebarOpen]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-bold">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!therapist) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-950">
        <LoginModal onClose={() => {}} hideCancel />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 overflow-hidden font-sans">
      {/* ── 모바일 전용 상단 바 (lg 미만에서만 표시) ── */}
      <div className="lg:hidden flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm z-30 flex-shrink-0">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="환자 목록 / 메뉴 열기"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 active:bg-gray-200 dark:active:bg-slate-700 transition-colors"
        >
          <Menu size={24} className="text-gray-700 dark:text-gray-200" />
        </button>
        <h1 className="font-extrabold text-gray-900 dark:text-gray-100 tracking-tight text-base">PT-NOTE</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
            title={theme === "dark" ? "라이트 모드" : "다크 모드"}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 active:bg-gray-200 dark:active:bg-slate-700 transition-colors"
          >
            {theme === "dark" ? (
              <Sun size={20} className="text-amber-300" />
            ) : (
              <Moon size={20} className="text-gray-700" />
            )}
          </button>
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 truncate max-w-[100px]">
            {therapist.name}
          </span>
        </div>
      </div>

      {/* ── Sidebar ── */}
      {/* 데스크톱: 항상 좌측에 정적으로 표시 */}
      <div className="hidden lg:flex w-[360px] xl:w-[400px] flex-shrink-0 flex-col h-full border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-10">
        <Sidebar />
      </div>

      {/* 모바일: drawer (좌측에서 슬라이드) */}
      <>
        {/* Backdrop */}
        {mobileSidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-200"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden
          />
        )}

        {/* Drawer */}
        <div
          className={`lg:hidden fixed inset-y-0 left-0 w-[85vw] max-w-sm bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="환자 목록 및 메뉴"
        >
          <button
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="메뉴 닫기"
            className="absolute top-2 right-2 z-10 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 active:bg-gray-200 dark:active:bg-slate-700 transition-colors"
          >
            <X size={22} className="text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex-1 overflow-hidden">
            <Sidebar />
          </div>
        </div>
      </>

      {/* ── Form (메인) ── */}
      <div className="w-full flex-1 overflow-y-auto relative bg-white dark:bg-slate-950 scroll-smooth">
        <ProgressNoteForm />
      </div>

      {/* Tauri 데스크톱 앱 전용 — 자동 업데이트 체커 (웹에서는 렌더 안 됨) */}
      <UpdateChecker />
    </div>
  );
}

export default function Home() {
  return <HomeContent />;
}
