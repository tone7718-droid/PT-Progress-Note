"use client";

import * as React from "react";
import { Modal, type ModalProps } from "./Modal";
import { Button } from "./Button";
import { AlertCircle } from "lucide-react";
import { cn } from "@/utils/cn";

/**
 * 공용 확인 다이얼로그 — 앱 전역에서 반복되던
 * "아이콘 원 + 제목 + 본문 + 취소/확인" 소형 모달을 표준화.
 */

const TONES = {
  danger: {
    circle: "bg-red-50 dark:bg-red-900/30",
    icon: "text-red-500",
    confirm: "danger" as const,
  },
  primary: {
    circle: "bg-blue-50 dark:bg-blue-900/30",
    icon: "text-blue-600 dark:text-blue-400",
    confirm: "primary" as const,
  },
  warning: {
    circle: "bg-amber-50 dark:bg-amber-900/30",
    icon: "text-amber-500",
    confirm: "danger" as const,
  },
};

export interface ConfirmDialogProps {
  tone?: keyof typeof TONES;
  layer?: ModalProps["layer"];
  /** 아이콘 원을 그리지 않으려면 null */
  icon?: React.ReactNode | null;
  title: string;
  /** 본문 (문단 스타일 포함해 그대로 렌더) */
  children: React.ReactNode;
  error?: string;
  cancelLabel?: string;
  confirmLabel: string;
  busy?: boolean;
  busyLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  tone = "danger",
  layer = "raised",
  icon,
  title,
  children,
  error,
  cancelLabel = "취소",
  confirmLabel,
  busy = false,
  busyLabel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const t = TONES[tone];
  return (
    <Modal layer={layer} size="sm">
      {icon !== null && (
        <div className={cn("w-14 h-14 rounded-full flex items-center justify-center mb-6 mx-auto", t.circle)}>
          {icon ?? <AlertCircle size={32} className={t.icon} />}
        </div>
      )}
      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center text-balance">{title}</h3>
      <div className="text-center text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">{children}</div>
      {error && <p className="text-red-500 dark:text-red-400 text-xs font-bold text-center mb-3">{error}</p>}
      <div className="flex gap-3">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button type="button" variant={t.confirm} className="flex-1" disabled={busy} onClick={onConfirm}>
          {busy ? busyLabel ?? "처리 중..." : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
