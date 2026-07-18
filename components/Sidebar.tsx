"use client";

import { useState, useRef, useEffect } from "react";
import { useNoteStore } from "@/store/useNoteStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Menu, Search, Plus, Trash2, UserPlus, LogIn, ChevronDown, ChevronRight, ArrowRightLeft, Shield, Download, Upload, Sparkles, KeyRound, AlertTriangle, TrendingUp, History } from "lucide-react";
import LoginModal from "./LoginModal";
import TherapistManagementModal from "./TherapistManagementModal";
import MacroManagementModal from "./MacroManagementModal";
import ChangePasswordModal from "./ChangePasswordModal";
import PatientTrendChart from "./PatientTrendChart";
import BackupRestoreModal from "./BackupRestoreModal";
import { verifyPassword } from "./hashUtils";
import { DEFAULT_PASSWORD } from "@/lib/passwordPolicy";
import { isEncryptedBackup } from "@/lib/localDataService";
import { todayLocalISO } from "@/lib/localDate";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";

/** 타임아웃 레이스 — settle 후 타이머를 반드시 정리 (유령 타이머 방지) */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

export default function Sidebar() {
  const notes = useNoteStore((s) => s.notes);
  const selectedNoteId = useNoteStore((s) => s.selectedNoteId);
  const selectNote = useNoteStore((s) => s.selectNote);
  const createNewNote = useNoteStore((s) => s.createNewNote);
  const deleteNotes = useNoteStore((s) => s.deleteNotes);
  const transferNotes = useNoteStore((s) => s.transferNotes);
  const exportData = useNoteStore((s) => s.exportData);
  const exportDataEncrypted = useNoteStore((s) => s.exportDataEncrypted);
  const importData = useNoteStore((s) => s.importData);
  
  const therapist = useAuthStore((s) => s.therapist);
  const therapists = useAuthStore((s) => s.therapists);
  const signOut = useAuthStore((s) => s.signOut);
  const reauthenticate = useAuthStore((s) => s.reauthenticate);

  const getResignedTherapistNotes = () => {
    const resigned = therapists.filter((t) => t.resigned);
    return resigned
      .map((rt) => ({
        therapistName: rt.name,
        therapistUid: rt.uid,
        notes: notes.filter((n) => n.therapistUid === rt.uid),
      }))
      .filter((g) => g.notes.length > 0);
  };
  const [search, setSearch] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showTherapistModal, setShowTherapistModal] = useState(false);
  const [showMacroModal, setShowMacroModal] = useState(false);
  const [showChangePwModal, setShowChangePwModal] = useState(false);
  const [usingDefaultPw, setUsingDefaultPw] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResignedFolder, setShowResignedFolder] = useState(false);
  const [showBackupRestore, setShowBackupRestore] = useState(false);

  /* ── 환자 추이 차트 ── */
  const [trendChartData, setTrendChartData] = useState<{ patientId?: string; patientName: string; chartNo: string } | null>(null);

  /* ── 삭제 2단계 비밀번호 확인 ── */
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [deletePwError, setDeletePwError] = useState("");

  /* ── 이관 ── */
  const [transferSource, setTransferSource] = useState<{ therapistUid: string; therapistName: string } | null>(null);

  /* ── 데이터 내보내기/가져오기 ── */
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* 내보내기 전 비밀번호 재확인 (환자정보 전체 덤프이므로 재인증 필수)
     + 백업 파일 암호(passphrase) 설정. 평문 내보내기는 명시적으로 선택해야 함. */
  const [showExportPwConfirm, setShowExportPwConfirm] = useState(false);
  const [exportPw, setExportPw] = useState("");
  const [exportPwError, setExportPwError] = useState("");
  const [backupPassphrase, setBackupPassphrase] = useState("");
  const [backupPassphrase2, setBackupPassphrase2] = useState("");
  const [exportPlain, setExportPlain] = useState(false);

  const MIN_BACKUP_PASSPHRASE = 8;

  /* 암호화 백업 가져오기 — 파일 선택 후 백업 암호 입력 모달 */
  const [pendingImportText, setPendingImportText] = useState<string | null>(null);
  const [importPassphrase, setImportPassphrase] = useState("");
  const [importPwError, setImportPwError] = useState("");

  const downloadTextFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportConfirm = async () => {
    if (!therapist || !therapist.id) {
      setExportPwError("로그인 정보를 확인할 수 없습니다.");
      return;
    }
    if (!exportPlain) {
      if (backupPassphrase.length < MIN_BACKUP_PASSPHRASE) {
        setExportPwError(`백업 암호는 ${MIN_BACKUP_PASSPHRASE}자 이상이어야 합니다.`);
        return;
      }
      if (backupPassphrase !== backupPassphrase2) {
        setExportPwError("백업 암호가 서로 일치하지 않습니다.");
        return;
      }
    }
    setExportPwError("");
    try {
      const ok = await withTimeout(
        reauthenticate(therapist.id, exportPw),
        10000,
        "비밀번호 확인 시간 초과"
      );
      if (!ok) {
        setExportPwError("비밀번호가 일치하지 않습니다.");
        return;
      }

      const dateStr = todayLocalISO();
      if (exportPlain) {
        downloadTextFile(await exportData(), `pt-progress-notes-backup-${dateStr}.json`);
      } else {
        downloadTextFile(
          await exportDataEncrypted(backupPassphrase),
          `pt-progress-notes-backup-${dateStr}.encrypted.json`
        );
      }
      setShowExportPwConfirm(false);
      setExportPw("");
      setBackupPassphrase("");
      setBackupPassphrase2("");
      setExportPlain(false);
    } catch (err) {
      setExportPwError((err as Error)?.message ?? "내보내기 중 오류가 발생했습니다.");
    }
  };

  const showImportResult = (result: { notesCount: number; therapistsCount: number; skippedCount: number }) => {
    const therapistMsg = result.therapistsCount > 0 ? `, 치료사 ${result.therapistsCount}명` : "";
    const skippedMsg = result.skippedCount > 0 ? `\n(형식 오류로 노트 ${result.skippedCount}건은 제외됨)` : "";
    alert(`가져오기 완료: 노트 ${result.notesCount}건${therapistMsg} 추가됨${skippedMsg}`);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      // 암호화 백업이면 암호 입력 모달로 넘긴다
      if (isEncryptedBackup(text)) {
        setPendingImportText(text);
        setImportPassphrase("");
        setImportPwError("");
        return;
      }
      try {
        showImportResult(await importData(text));
      } catch {
        alert("데이터 가져오기 실패: 올바른 JSON 파일인지 확인해주세요.");
      }
    };
    reader.onerror = () => {
      alert("파일을 읽지 못했습니다. 파일 상태를 확인한 뒤 다시 시도해주세요.");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleEncryptedImportConfirm = async () => {
    if (!pendingImportText) return;
    setImportPwError("");
    try {
      const result = await importData(pendingImportText, importPassphrase);
      setPendingImportText(null);
      setImportPassphrase("");
      showImportResult(result);
    } catch (err) {
      setImportPwError((err as Error)?.message ?? "가져오기에 실패했습니다.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      alert("로그아웃에 실패했습니다.");
    }
  };

  const isMaster = therapist?.role === "master";

  /* 로그인한 치료사가 아직 기본 비밀번호(0000)를 쓰고 있는지 검사.
     therapists(해시 포함)가 갱신될 때마다 재평가 → 변경 완료 시 배너 자동 사라짐.
     setState 는 async 콜백 안에서만 호출 (effect 동기 setState 금지 규칙 준수). */
  useEffect(() => {
    let cancelled = false;
    const rec = therapist ? therapists.find((t) => t.uid === therapist.uid) : undefined;
    const check = rec
      ? verifyPassword(DEFAULT_PASSWORD, rec.passwordHash)
      : Promise.resolve(false);
    void check.then((isDefault) => {
      if (!cancelled) setUsingDefaultPw(isDefault);
    });
    return () => {
      cancelled = true;
    };
  }, [therapist, therapists]);

  /* 현재 로그인된 치료사의 노트만 표시 (master는 전체, 단 퇴사자 노트는 폴더에서만) */
  const visibleNotes = notes.filter((n) => {
    if (isMaster) {
      const isResigned = therapists.some((t) => t.resigned && t.uid === n.therapistUid);
      return !isResigned;
    }
    if (therapist) return n.therapistUid === therapist.uid || !n.therapistUid;
    return true;
  });

  const filteredNotes = visibleNotes
    .filter(
      // ?? "" — 구버전/외부 백업에서 필드가 빠진 노트가 있어도 crash 하지 않도록 방어
      (n) =>
        (n.patientName ?? "").includes(search) ||
        (n.diagnosis ?? "").includes(search) ||
        (n.chartNo ?? "").includes(search)
    )
    .sort((a, b) => new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime());

  const resignedGroups = getResignedTherapistNotes();
  const activeTherapists = therapists.filter((t) => !t.resigned && t.role !== "master");

  const handleDeleteStep1Confirm = () => {
    setShowDeleteModal(false);
    setShowPwConfirm(true);
    setDeletePw("");
    setDeletePwError("");
  };

  const handleDeleteStep2Confirm = async () => {
    if (!therapist || !therapist.id) {
      setDeletePwError("로그인 정보를 확인할 수 없습니다.");
      return;
    }
    setDeletePwError("");
    try {
      // 1) 비밀번호 재확인 (10초 타임아웃)
      const ok = await withTimeout(
        reauthenticate(therapist.id, deletePw),
        10000,
        "비밀번호 확인 시간 초과"
      );
      if (!ok) {
        setDeletePwError("비밀번호가 일치하지 않습니다.");
        return;
      }

      // 2) 실제 삭제 — localStorage 쓰기라 즉시 완료됨. 타임아웃 레이스를 걸면
      //    실제로는 삭제가 반영됐는데 "시간 초과" 오류로 오인 표시될 수 있어 제거.
      await deleteNotes(selectedIds);

      // 3) 모달/상태 정리
      setIsDeleteMode(false);
      setSelectedIds([]);
      setShowPwConfirm(false);
      setDeletePw("");
      alert("선택한 기록이 삭제되었습니다.");
    } catch (err) {
      console.error("[delete] failed:", err);
      setDeletePwError(
        (err as Error)?.message ?? "삭제 처리 중 오류가 발생했습니다."
      );
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 relative">
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
        <div className="relative flex-shrink-0">
          <button onClick={() => setShowDropdown(!showDropdown)} className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 transition-colors" aria-label="메뉴 열기" title="메뉴 열기"><Menu size={24} /></button>
          {showDropdown && (
            <>
              <div className="fixed inset-0 z-[50]" onClick={() => setShowDropdown(false)} />
              <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 py-2 z-[60] animate-in fade-in slide-in-from-top-2 duration-150">
                {/* 환자정보·계정을 다루는 메뉴는 로그인 상태에서만 노출.
                    (localStorage 특성상 근본 방어는 아니지만, UI 수준 접근 통제) */}
                {!therapist && (
                  <button onClick={() => { setShowLoginModal(true); setShowDropdown(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"><LogIn size={18} /> 로그인</button>
                )}
                {isMaster && (
                  <button onClick={() => { setShowTherapistModal(true); setShowDropdown(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-300 transition-colors"><UserPlus size={18} /> 치료사 등록 / 관리</button>
                )}
                {therapist && (
                  <>
                    <button onClick={() => { setShowMacroModal(true); setShowDropdown(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"><Sparkles size={18} /> 매크로 관리 (/도수1~20)</button>
                    <hr className="my-1 border-gray-100 dark:border-slate-700" />
                    <button onClick={() => { setShowExportPwConfirm(true); setExportPw(""); setExportPwError(""); setBackupPassphrase(""); setBackupPassphrase2(""); setExportPlain(false); setShowDropdown(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"><Download size={18} /> 데이터 내보내기</button>
                    <button onClick={() => { fileInputRef.current?.click(); setShowDropdown(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"><Upload size={18} /> 데이터 가져오기</button>
                  </>
                )}
                {isMaster && (
                  <button onClick={() => { setShowBackupRestore(true); setShowDropdown(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"><History size={18} /> 자동 백업 복원</button>
                )}
              </div>
            </>
          )}
        </div>
        <div className="flex-1 relative">
          <input id="sidebar-search" type="text" placeholder="환자 이름 · 진단명 검색..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-4 pr-11 py-3 bg-gray-50 dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 rounded-xl text-sm font-medium outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500" aria-label="기록 검색" />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-500" aria-label="검색 실행"><Search size={18} /></button>
        </div>
      </div>

      {therapist && (
        <div className="px-4 pt-4 shrink-0 space-y-2">
          <div className="flex items-center justify-between gap-2 text-[15px] font-bold text-gray-800 dark:text-gray-100 bg-blue-50 dark:bg-blue-900/30 px-4 py-3 rounded-2xl border border-blue-100 dark:border-blue-800 shadow-sm w-full">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`${isMaster ? "bg-amber-500" : "bg-blue-600"} text-white p-1.5 rounded-full shrink-0`}><Shield size={16} /></div>
              <span className="truncate">{therapist.name} {therapist.id && <span className="text-gray-400 dark:text-gray-500 font-mono text-xs">({therapist.id})</span>}</span>
            </div>
            <button onClick={handleLogout} className="shrink-0 text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-bold bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-red-100 dark:border-red-900 shadow-sm transition-colors">로그아웃</button>
          </div>

          {/* 상시 노출 — 비밀번호 변경 (모달/메뉴에 숨기지 않음, 반복 사용 가능) */}
          <button
            onClick={() => setShowChangePwModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm transition-colors"
          >
            <KeyRound size={16} /> 비밀번호 변경
          </button>

          {/* 기본 비밀번호(0000) 사용 중 — 권장 경고 (차단 아님) */}
          {usingDefaultPw && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-200">기본 비밀번호 사용 중 — 변경하세요</p>
                <button
                  onClick={() => setShowChangePwModal(true)}
                  className="mt-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  지금 변경
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-4 shrink-0 pb-2">
        <button type="button" onClick={createNewNote} className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-2xl shadow-lg transition-all transform hover:-translate-y-0.5"><Plus size={20} /> 새 노트 작성</button>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-slate-950/40">
        <div className="px-4 pt-2 pb-1 flex justify-between items-center">
          <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400">최신 치료 내역</h3>
          {filteredNotes.length > 0 && (
            <button
              onClick={() => {
                /* 삭제 모드에서 선택된 노트가 있으면 휴지통 재탭 = 삭제 확인 진입.
                   모바일에서 하단 [기록 삭제] 버튼이 키보드/세이프에어리어에 가려져
                   "삭제가 안 된다"고 느끼는 케이스 방어. */
                if (isDeleteMode && selectedIds.length > 0) {
                  setShowDeleteModal(true);
                  return;
                }
                setIsDeleteMode(!isDeleteMode);
                setSelectedIds([]);
              }}
              className={`p-1.5 rounded-md transition-colors ${
                isDeleteMode && selectedIds.length > 0
                  ? "text-white bg-red-600 hover:bg-red-700"
                  : isDeleteMode
                  ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30"
                  : "text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-800"
              }`}
              aria-label={
                isDeleteMode && selectedIds.length > 0
                  ? `선택한 ${selectedIds.length}건 삭제`
                  : "삭제 모드 전환"
              }
              title={
                isDeleteMode && selectedIds.length > 0
                  ? `선택한 ${selectedIds.length}건 삭제`
                  : "삭제 모드 전환"
              }
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {filteredNotes.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center h-32 opacity-40 justify-center text-sm font-medium text-gray-700 dark:text-gray-300">기록이 없습니다.</div>
        ) : (
          <ul className="p-3 space-y-2.5">
            {filteredNotes.map((note) => (
              <li key={note.id} onClick={() => { if (isDeleteMode) setSelectedIds(prev => prev.includes(note.id) ? prev.filter(i => i !== note.id) : [...prev, note.id]); else selectNote(note.id); }}
                className={`group p-4 rounded-2xl cursor-pointer transition-all border-2 flex items-center gap-3 ${selectedNoteId === note.id && !isDeleteMode ? "bg-blue-50/50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800" : "bg-white dark:bg-slate-800 border-transparent shadow-sm"} ${isDeleteMode && selectedIds.includes(note.id) ? "!border-red-200 dark:!border-red-800 !bg-red-50 dark:!bg-red-900/30" : ""}`}>
                {isDeleteMode && <input type="checkbox" checked={selectedIds.includes(note.id)} readOnly className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-red-600" aria-label={`${note.patientName} 기록 선택`} />}
                <span className={`font-bold text-[15px] truncate block flex-1 text-left ${selectedNoteId === note.id && !isDeleteMode ? "text-blue-800 dark:text-blue-200" : isDeleteMode && selectedIds.includes(note.id) ? "text-red-800 dark:text-red-200" : "text-gray-900 dark:text-gray-100"}`}>
                  {note.patientName || "(이름 없음)"} - {formatDate(note.savedAt)}
                </span>
                {!isDeleteMode && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setTrendChartData({ patientId: note.patientId, patientName: note.patientName, chartNo: note.chartNo }); }}
                    className="shrink-0 p-1.5 rounded-lg text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    aria-label={`${note.patientName} 추이 보기`}
                    title="이 환자의 치료 추이 그래프 보기"
                  >
                    <TrendingUp size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {isMaster && resignedGroups.length > 0 && (
          <div className="px-3 pb-3 mt-2">
            <button onClick={() => setShowResignedFolder(!showResignedFolder)} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 font-bold text-sm">
              {showResignedFolder ? <ChevronDown size={16} /> : <ChevronRight size={16} />} 퇴사한 치료사 기록 <span className="ml-auto text-xs bg-amber-200 dark:bg-amber-800 dark:text-amber-100 px-2 py-0.5 rounded-full">{resignedGroups.reduce((s, g) => s + g.notes.length, 0)}</span>
            </button>
            {showResignedFolder && (
              <div className="mt-2 space-y-3">
                {resignedGroups.map((group) => (
                  <div key={group.therapistUid} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-50 dark:border-slate-700">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{group.therapistName} (퇴사)</span>
                      <button onClick={() => setTransferSource({ therapistUid: group.therapistUid, therapistName: group.therapistName })} className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-100 dark:border-blue-800"><ArrowRightLeft size={12} /> 이관</button>
                    </div>
                    <ul className="space-y-1">
                      {group.notes.map((note) => (
                        <li key={note.id} onClick={() => selectNote(note.id)} className={`p-2.5 rounded-lg cursor-pointer text-sm font-medium transition-colors ${selectedNoteId === note.id ? "bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"}`}>
                          {note.patientName || "(이름 없음)"} - {formatDate(note.savedAt)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-50 dark:bg-slate-950/40 shrink-0 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between min-h-[56px]">
        <span className="text-xs font-bold text-gray-400 dark:text-gray-500">총 {notes.length}건</span>
        {isDeleteMode && selectedIds.length > 0 && (
          <button onClick={() => setShowDeleteModal(true)} className="px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors">기록 삭제 ({selectedIds.length}건)</button>
        )}
      </div>

      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
      {showTherapistModal && <TherapistManagementModal onClose={() => setShowTherapistModal(false)} />}
      {showMacroModal && <MacroManagementModal onClose={() => setShowMacroModal(false)} />}
      {showChangePwModal && <ChangePasswordModal onClose={() => setShowChangePwModal(false)} />}
      {showBackupRestore && <BackupRestoreModal onClose={() => setShowBackupRestore(false)} />}
      {trendChartData && (
        <PatientTrendChart
          patientId={trendChartData.patientId}
          patientName={trendChartData.patientName}
          chartNo={trendChartData.chartNo}
          onClose={() => setTrendChartData(null)}
        />
      )}
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportData} className="hidden" />

      {/* ── 삭제 확인 모달 (1단계) ── */}
      {showDeleteModal && (
        <ConfirmDialog
          tone="danger"
          title="기록 삭제 경고"
          cancelLabel="아니오"
          confirmLabel="예 (삭제)"
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteStep1Confirm}
        >
          선택한 <span className="font-bold text-red-600 dark:text-red-400">{selectedIds.length}건</span>의 기록을<br />정말로 삭제하시겠습니까?
        </ConfirmDialog>
      )}

      {/* ── 삭제 2단계: 비밀번호 확인 ── */}
      {showPwConfirm && (
        <Modal layer="top" size="sm">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center text-balance">본인 확인 비밀번호</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 font-medium text-sm text-center">삭제를 완료하려면 치료사의<br />비밀번호를 다시 입력해주세요.</p>
          <label htmlFor="confirm-delete-pw" className="sr-only">비밀번호 입력</label>
          <input id="confirm-delete-pw" type="password" value={deletePw} onChange={(e) => { setDeletePw(e.target.value); setDeletePwError(""); }} placeholder="비밀번호 입력"
            className="w-full p-4 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-center font-bold tracking-widest outline-none mb-3" autoFocus />
          {deletePwError && <p className="text-red-500 dark:text-red-400 text-sm font-bold text-center mb-3">{deletePwError}</p>}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => { setShowPwConfirm(false); setDeletePw(""); }}>취소</Button>
            <Button type="button" variant="danger" className="flex-1" onClick={handleDeleteStep2Confirm}>삭제 확인</Button>
          </div>
        </Modal>
      )}

      {/* ── 데이터 내보내기 (본인 확인 + 백업 암호 설정) ── */}
      {showExportPwConfirm && (
        <Modal layer="top" size="sm">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center text-balance">데이터 내보내기</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4 font-medium text-sm text-center">환자 정보 전체가 포함된 백업 파일입니다.<br />본인 비밀번호를 다시 입력해주세요.</p>

            <label htmlFor="confirm-export-pw" className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1.5">내 비밀번호 (본인 확인)</label>
            <input id="confirm-export-pw" type="password" value={exportPw} onChange={(e) => { setExportPw(e.target.value); setExportPwError(""); }} placeholder="비밀번호 입력"
              className="w-full p-3.5 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-bold tracking-widest outline-none mb-4" autoFocus />

            {!exportPlain && (
              <>
                <label htmlFor="backup-passphrase" className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1.5">백업 파일 암호 (복원 시 필요 — {MIN_BACKUP_PASSPHRASE}자 이상)</label>
                <input id="backup-passphrase" type="password" value={backupPassphrase} onChange={(e) => { setBackupPassphrase(e.target.value); setExportPwError(""); }} placeholder="백업 파일을 잠글 암호"
                  className="w-full p-3.5 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-2xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 font-bold tracking-widest outline-none mb-2" />
                <label htmlFor="backup-passphrase2" className="sr-only">백업 파일 암호 확인</label>
                <input id="backup-passphrase2" type="password" value={backupPassphrase2} onChange={(e) => { setBackupPassphrase2(e.target.value); setExportPwError(""); }} placeholder="백업 암호 다시 입력"
                  className="w-full p-3.5 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-2xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 font-bold tracking-widest outline-none mb-2" />
                <p className="flex items-start gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 mb-3 leading-snug"><AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-500" /> 이 암호를 잊으면 백업 파일을 복원할 수 없습니다. 안전한 곳에 따로 기록해두세요.</p>
              </>
            )}

            <label className="flex items-start gap-2 mb-4 cursor-pointer select-none">
              <input type="checkbox" checked={exportPlain} onChange={(e) => { setExportPlain(e.target.checked); setExportPwError(""); }} className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-slate-600" />
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300">암호화 없이 내보내기 (권장하지 않음)</span>
            </label>
            {exportPlain && (
              <p className="flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400 mb-4 font-bold text-xs text-center bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2"><AlertTriangle size={14} className="shrink-0" /><span>환자정보가 평문 JSON 으로 저장됩니다.<br />파일이 유출되면 누구나 열람할 수 있습니다.</span></p>
            )}

            {exportPwError && <p className="text-red-500 dark:text-red-400 text-sm font-bold text-center mb-3">{exportPwError}</p>}
            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => { setShowExportPwConfirm(false); setExportPw(""); setBackupPassphrase(""); setBackupPassphrase2(""); setExportPlain(false); }}>취소</Button>
              <Button type="button" variant="primary" className="flex-1" onClick={handleExportConfirm}>내보내기</Button>
            </div>
        </Modal>
      )}

      {/* ── 암호화 백업 가져오기 — 백업 암호 입력 ── */}
      {pendingImportText && (
        <Modal layer="top" size="sm">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center text-balance">암호화된 백업 파일</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 font-medium text-sm text-center">이 백업은 암호로 보호되어 있습니다.<br />내보낼 때 설정한 백업 암호를 입력해주세요.</p>
          <label htmlFor="import-passphrase" className="sr-only">백업 암호 입력</label>
          <input id="import-passphrase" type="password" value={importPassphrase} onChange={(e) => { setImportPassphrase(e.target.value); setImportPwError(""); }} placeholder="백업 암호 입력"
            className="w-full p-4 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-center font-bold tracking-widest outline-none mb-3" autoFocus />
          {importPwError && <p className="text-red-500 dark:text-red-400 text-sm font-bold text-center mb-3">{importPwError}</p>}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => { setPendingImportText(null); setImportPassphrase(""); }}>취소</Button>
            <Button type="button" variant="primary" className="flex-1" onClick={handleEncryptedImportConfirm}>가져오기</Button>
          </div>
        </Modal>
      )}

      {/* ── 이관 모달 ── */}
      {transferSource && (
        <Modal layer="raised" size="sm">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">기록 이관</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">퇴사한 {transferSource.therapistName}의 모든 기록을<br />아래 치료사 중 한 명에게 이관합니다.</p>
            <ul className="space-y-2 max-h-48 overflow-y-auto mb-6">
              {activeTherapists.map((t) => (
                <li key={t.uid}>
                  <button onClick={async () => {
                    try {
                      await transferNotes(transferSource.therapistUid, t.uid, t.name, t.id);
                      setTransferSource(null);
                      alert(`${t.name} 치료사에게 이관되었습니다.`);
                    } catch {
                      alert("이관 처리 중 오류가 발생했습니다.");
                    }
                  }}
                    className="w-full flex items-center justify-between p-3.5 bg-gray-50 dark:bg-slate-800 rounded-xl border-2 border-gray-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all font-bold text-left text-gray-900 dark:text-gray-100">
                    <span>{t.name} <span className="text-gray-400 dark:text-gray-500 font-mono text-xs">({t.id})</span></span>
                    <ArrowRightLeft size={14} className="text-blue-500 dark:text-blue-400" />
                  </button>
                </li>
              ))}
            </ul>
            <Button type="button" variant="secondary" className="w-full" onClick={() => setTransferSource(null)}>취소</Button>
        </Modal>
      )}
    </div>
  );
}

function formatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  } catch { return isoStr; }
}
