"use client";

import Sidebar from "@/components/Sidebar";
import ProgressNoteForm from "@/components/ProgressNoteForm";
import LoginModal from "@/components/LoginModal";
import UpdateChecker from "@/components/UpdateChecker";
// import DataMigrationModal from "@/components/DataMigrationModal"; // 클라우드 모드 전용
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useNoteStore } from "@/store/useNoteStore";

function HomeContent() {
  const therapist = useAuthStore((s) => s.therapist);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const isNoteLoading = useNoteStore((s) => s.isLoading);
  const isLoading = isAuthLoading || isNoteLoading;
  const initSync = useNoteStore((s) => s.initSync);
  const checkLocalData = useNoteStore((s) => s.checkLocalData);
  
  const [showMigration, setShowMigration] = useState(false); // 클라우드 모드 전용

  useEffect(() => {
    checkLocalData();
    initSync();
  }, [checkLocalData, initSync]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-bold">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!therapist) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <LoginModal onClose={() => {}} hideCancel />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50 text-gray-900 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-full lg:w-[360px] xl:w-[400px] flex-shrink-0 flex flex-col h-[35vh] lg:h-full border-b lg:border-b-0 lg:border-r border-gray-200 bg-white shadow-sm z-10 transition-all">
        <Sidebar />
      </div>

      {/* Form */}
      <div className="w-full flex-1 overflow-y-auto relative bg-white scroll-smooth">
        <ProgressNoteForm />
      </div>

      {/* 클라우드 모드 전용 — 마이그레이션 모달 */}
      {/* {showMigration && <DataMigrationModal onClose={() => setShowMigration(false)} />} */}

      {/* Tauri 데스크톱 앱 전용 — 자동 업데이트 체커 (웹에서는 렌더 안 됨) */}
      <UpdateChecker />
    </div>
  );
}

export default function Home() {
  return <HomeContent />;
}
