"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Save, Sparkles, Check } from "lucide-react";
import { loadMacros, saveMacros } from "@/lib/macros";
import { Modal } from "@/components/ui/Modal";

interface MacroManagementModalProps {
  onClose: () => void;
}

export default function MacroManagementModal({ onClose }: MacroManagementModalProps) {
  const [slots, setSlots] = useState<string[]>(() => loadMacros());
  // 마지막 저장 시점의 스냅샷 — 닫기 전 미저장 변경 감지용
  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => JSON.stringify(loadMacros()));
  const [savedFlash, setSavedFlash] = useState(false);

  /* 미저장 변경이 있으면 확인 후 닫기 */
  const requestClose = useCallback(() => {
    if (JSON.stringify(slots) !== savedSnapshot) {
      if (!window.confirm("저장하지 않은 변경 사항이 있습니다. 저장 없이 닫을까요?")) return;
    }
    onClose();
  }, [slots, savedSnapshot, onClose]);

  // ESC 로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [requestClose]);

  const setSlot = (idx: number, value: string) => {
    setSlots((cur) => {
      const next = [...cur];
      next[idx] = value;
      return next;
    });
  };

  const handleSave = () => {
    saveMacros(slots);
    setSavedSnapshot(JSON.stringify(slots));
    // 다른 SmartTextarea 인스턴스에 알림
    window.dispatchEvent(new Event("pt-macros-updated"));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  return (
    <Modal layer="base" size="lg">
        {/* 헤더 */}
        <div className="px-4 py-3 sm:px-8 sm:py-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-gray-50/50 dark:bg-slate-950/40">
          <h2 className="text-sm sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 min-w-0">
            <Sparkles className="text-blue-600 dark:text-blue-400 shrink-0" size={20} />
            <span className="truncate">매크로 관리 (/도수1~20)</span>
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            {savedFlash && (
              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-xs sm:text-sm font-bold animate-in fade-in duration-200">
                <Check size={14} /> 저장됨
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1 sm:gap-2 px-3 py-2 sm:px-5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg sm:rounded-xl shadow-md transition-colors"
              aria-label="매크로 저장"
            >
              <Save size={14} /> 저장
            </button>
            <button onClick={requestClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors text-gray-500 dark:text-gray-400" aria-label="모달 닫기">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 안내 */}
        <div className="px-6 sm:px-8 py-3 bg-blue-50/60 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900 text-xs sm:text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
          텍스트 입력창에 <span className="font-bold">/도수</span> 를 입력하면 등록된 문구 목록이 뜨고,{" "}
          <span className="font-bold">/도수3</span> 처럼 슬롯 번호까지 입력하면 해당 문구가 바로 자동 완성됩니다.
        </div>

        {/* 슬롯 리스트 */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 space-y-2">
          {slots.map((value, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="shrink-0 mt-2 px-2 py-1 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 rounded-md text-xs font-bold font-mono w-16 text-center">
                /도수{idx + 1}
              </span>
              <textarea
                value={value}
                onChange={(e) => setSlot(idx, e.target.value)}
                placeholder={`슬롯 ${idx + 1} — 자주 쓰는 도수치료 문구를 입력하세요`}
                rows={2}
                className="flex-1 min-w-0 p-2 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 resize-y"
              />
            </div>
          ))}
        </div>

        {/* 푸터 */}
        <div className="px-4 sm:px-8 py-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-gray-50/40 dark:bg-slate-950/40">
          {savedFlash && (
            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-bold animate-in fade-in slide-in-from-right-2 duration-200">
              <Check size={16} /> 저장됨
            </span>
          )}
          <button
            type="button"
            onClick={requestClose}
            className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors"
          >
            <Save size={16} /> 저장
          </button>
        </div>
    </Modal>
  );
}
