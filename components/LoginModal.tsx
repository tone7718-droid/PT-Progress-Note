"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface LoginModalProps {
  onClose: () => void;
  hideCancel?: boolean;
}

export default function LoginModal({ onClose, hideCancel }: LoginModalProps) {
  const signIn = useAuthStore((s) => s.signIn);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hideCancel) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, hideCancel]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!userId.trim() || !password.trim()) {
      setError("ID 또는 비밀번호를 확인해주세요.");
      setLoading(false);
      return;
    }

    try {
      await signIn(userId.trim(), password);
      setLoading(false);
      onClose();
    } catch (err) {
      setError((err as Error).message || "로그인에 실패했습니다.");
      setLoading(false);
    }
  };

  return (
    <Modal layer="login" size="plain">
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center tracking-tight">치료사 로그인</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-id" className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1.5">치료사 ID</label>
              <input id="login-id" type="text" value={userId} onChange={(e) => { setUserId(e.target.value); setError(""); }}
                placeholder="예: PT-001 또는 master"
                className="w-full p-4 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium text-lg placeholder:text-gray-400 dark:placeholder:text-gray-500"
                autoFocus />
            </div>
            <div>
              <label htmlFor="login-pw" className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1.5">비밀번호</label>
              <input id="login-pw" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                className="w-full p-4 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium text-lg placeholder:text-gray-400 dark:placeholder:text-gray-500 tracking-widest" />
            </div>
            {error && <p className="text-red-500 dark:text-red-400 text-sm font-bold text-center mt-2">{error}</p>}
            <div className="pt-6 flex gap-3">
              {!hideCancel && (
                <Button type="button" variant="secondary" size="lg" className="flex-[0.4] px-0" onClick={onClose}>취소</Button>
              )}
              <Button type="submit" variant="primary" size="lg" className="flex-1" disabled={loading}>{loading ? "인증 중..." : "로그인"}</Button>
            </div>
          </form>
        </div>
    </Modal>
  );
}
