"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { KeyRound, X, ShieldCheck } from "lucide-react";
import { validateNewPassword, PASSWORD_MIN, PASSWORD_MAX } from "@/lib/passwordPolicy";

interface ChangePasswordModalProps {
  onClose: () => void;
}

/**
 * 치료사 본인 비밀번호 변경.
 * 흐름: 현재 비밀번호 → reauthenticate 검증 → 새 비밀번호 + 확인 → 저장(PBKDF2).
 * 마스터/일반 치료사 공통. 횟수 제한 없이 반복 사용 가능.
 */
export default function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const therapist = useAuthStore((s) => s.therapist);
  const reauthenticate = useAuthStore((s) => s.reauthenticate);
  const updateTherapistPassword = useAuthStore((s) => s.updateTherapistPassword);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!therapist?.id) {
      setError("세션 정보를 확인할 수 없습니다. 다시 로그인해주세요.");
      return;
    }
    if (!currentPw) {
      setError("현재 비밀번호를 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      // 1) 현재 비밀번호 검증
      const ok = await reauthenticate(therapist.id, currentPw);
      if (!ok) {
        setError("현재 비밀번호가 일치하지 않습니다.");
        setSaving(false);
        return;
      }

      // 2) 새 비밀번호 정책 검증 (길이/문자/기본값 0000 거부)
      const policyError = validateNewPassword(newPw);
      if (policyError) {
        setError(policyError);
        setSaving(false);
        return;
      }

      // 3) 확인 입력 일치
      if (newPw !== confirmPw) {
        setError("새 비밀번호가 일치하지 않습니다.");
        setSaving(false);
        return;
      }

      // 4) 저장 (PBKDF2, 반복 변경 가능)
      await updateTherapistPassword(newPw);
      setDone(true);
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setError((err as Error).message || "비밀번호 변경 중 오류가 발생했습니다.");
      setSaving(false);
    }
  };

  const inputCls =
    "w-full p-3.5 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 font-medium tracking-wider placeholder:text-gray-400 dark:placeholder:text-gray-500";

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200 print:hidden">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <KeyRound size={20} className="text-blue-600 dark:text-blue-400" /> 비밀번호 변경
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-500 dark:text-gray-400"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {done ? (
          <div className="p-8 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
              <ShieldCheck size={30} className="text-green-600 dark:text-green-400" />
            </div>
            <p className="font-bold text-gray-900 dark:text-gray-100">비밀번호가 변경되었습니다.</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">다음 로그인부터 새 비밀번호를 사용하세요.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {therapist?.name}
              {therapist?.id && <span className="font-mono"> ({therapist.id})</span>} 계정의 비밀번호를 변경합니다.
            </p>

            <div>
              <label htmlFor="cpw-current" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                현재 비밀번호
              </label>
              <input
                id="cpw-current"
                type="password"
                value={currentPw}
                onChange={(e) => {
                  setCurrentPw(e.target.value);
                  setError("");
                }}
                className={inputCls}
                placeholder="현재 비밀번호"
                autoFocus
                autoComplete="current-password"
              />
            </div>

            <div>
              <label htmlFor="cpw-new" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                새 비밀번호
              </label>
              <input
                id="cpw-new"
                type="password"
                value={newPw}
                onChange={(e) => {
                  setNewPw(e.target.value);
                  setError("");
                }}
                className={inputCls}
                placeholder={`${PASSWORD_MIN}~${PASSWORD_MAX}자 영문·숫자·특수문자`}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="cpw-confirm" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                새 비밀번호 확인
              </label>
              <input
                id="cpw-confirm"
                type="password"
                value={confirmPw}
                onChange={(e) => {
                  setConfirmPw(e.target.value);
                  setError("");
                }}
                className={inputCls}
                placeholder="새 비밀번호 다시 입력"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <p className="text-red-500 dark:text-red-400 text-sm font-bold text-center bg-red-50 dark:bg-red-900/20 py-2.5 px-3 rounded-xl">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-[0.5] py-3.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 font-bold rounded-2xl transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-2xl shadow-lg transition-colors focus:ring-4 focus:ring-blue-500/40"
              >
                {saving ? "변경 중..." : "변경하기"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
