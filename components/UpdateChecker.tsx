"use client";

import { useEffect, useState } from "react";
import { Download, X, CheckCircle } from "lucide-react";
import { isTauri } from "@/lib/isTauri";

/**
 * Tauri 데스크톱 앱에서만 작동하는 업데이트 체크/설치 모달.
 * - 앱 시작 후 3초 뒤 자동으로 백그라운드에서 새 버전 확인
 * - 새 버전 있으면 다운로드 → 설치 → 재시작 흐름 제공
 * - 웹(Vercel)에서는 아무것도 렌더하지 않음
 */
type Phase = "idle" | "checking" | "available" | "downloading" | "ready" | "error" | "up-to-date";

interface UpdateInfo {
  version: string;
  notes: string;
}

export default function UpdateChecker() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState({ downloaded: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;

    // 시작 3초 후 자동 체크 (앱 초기화와 경쟁 방지)
    const timer = setTimeout(() => {
      void checkForUpdate();
    }, 3000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkForUpdate() {
    setPhase("checking");
    setErrorMsg("");
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (update) {
        setInfo({ version: update.version, notes: update.body ?? "" });
        setPhase("available");
      } else {
        setPhase("up-to-date");
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
      setPhase("error");
    }
  }

  async function downloadAndInstall() {
    setPhase("downloading");
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const { relaunch } = await import("@tauri-apps/plugin-process");

      const update = await check();
      if (!update) {
        setPhase("up-to-date");
        return;
      }

      let total = 0;
      let downloaded = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            total = event.data.contentLength ?? 0;
            setProgress({ downloaded: 0, total });
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            setProgress({ downloaded, total });
            break;
          case "Finished":
            setPhase("ready");
            break;
        }
      });

      // 다운로드 + 설치 완료 → 재시작
      await relaunch();
    } catch (err) {
      setErrorMsg((err as Error).message);
      setPhase("error");
    }
  }

  // 웹 또는 dismiss 된 상태에서는 렌더하지 않음
  if (!isTauri() || dismissed) return null;

  // up-to-date / idle / checking → 조용히 숨김 (사용자 방해 X)
  if (phase === "idle" || phase === "checking" || phase === "up-to-date") return null;

  return (
    <div className="fixed bottom-6 right-6 z-[250] max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-start justify-between px-5 pt-4 pb-2">
        <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
          {phase === "ready" ? (
            <CheckCircle size={18} className="text-green-600" />
          ) : (
            <Download size={18} className="text-blue-600" />
          )}
          {phase === "available" && "새 버전 사용 가능"}
          {phase === "downloading" && "업데이트 다운로드 중"}
          {phase === "ready" && "업데이트 완료"}
          {phase === "error" && "업데이트 오류"}
        </h3>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="닫기"
        >
          <X size={16} />
        </button>
      </div>

      <div className="px-5 pb-5">
        {phase === "available" && info && (
          <>
            <p className="text-xs text-gray-600 mb-1">
              <span className="font-bold">v{info.version}</span> 을 사용할 수 있습니다.
            </p>
            {info.notes && (
              <p className="text-xs text-gray-500 mb-3 line-clamp-3 whitespace-pre-wrap">
                {info.notes}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={downloadAndInstall}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors"
              >
                지금 업데이트
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-colors"
              >
                나중에
              </button>
            </div>
          </>
        )}

        {phase === "downloading" && (
          <>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                style={{
                  width:
                    progress.total > 0
                      ? `${(progress.downloaded / progress.total) * 100}%`
                      : "0%",
                }}
              />
            </div>
            <p className="text-xs text-gray-500 font-medium">
              {formatBytes(progress.downloaded)} / {formatBytes(progress.total)}
            </p>
          </>
        )}

        {phase === "ready" && (
          <p className="text-xs text-gray-600">
            설치가 완료되어 앱이 곧 재시작됩니다.
          </p>
        )}

        {phase === "error" && (
          <>
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mb-2 break-all">
              {errorMsg || "알 수 없는 오류"}
            </p>
            <button
              onClick={checkForUpdate}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-colors"
            >
              다시 시도
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n === 0) return "0 B";
  const k = 1024;
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(k)), units.length - 1);
  return `${(n / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}
