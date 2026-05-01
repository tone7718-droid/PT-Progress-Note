"use client";

import React, { useState, useMemo } from "react";
import { RotateCcw } from "lucide-react";
import type { PainEntry, PainLevel, PainView } from "@/types";

/* ════════════════════════════════════════════════════════
   Body Diagram (Clinical Pain Map)
   - 전면(Anterior) + 후면(Posterior) 두 SVG, 각 ~40부위
   - 클릭 시 0 → 1(경도) → 2(중등도) → 3(중증) → 0 사이클
   - data-group 으로 묶인 부위(예: 복직근 6칸)는 같이 토글
   - value/onChange 패턴으로 react-hook-form 통합
   ════════════════════════════════════════════════════════ */

type Part =
  | { kind: "polygon"; view: PainView; name: string; deep?: boolean; group?: string; points: string }
  | { kind: "circle"; view: PainView; name: string; deep?: boolean; group?: string; cx: number; cy: number; r: number }
  | { kind: "ellipse"; view: PainView; name: string; deep?: boolean; group?: string; cx: number; cy: number; rx: number; ry: number }
  | { kind: "rect"; view: PainView; name: string; deep?: boolean; group?: string; x: number; y: number; width: number; height: number; rx?: number }
  | { kind: "path"; view: PainView; name: string; deep?: boolean; group?: string; d: string; fillRule?: "evenodd" | "nonzero" };

const PAIN_LABEL: Record<PainLevel, string> = { 1: "경도(Mild)", 2: "중등도(Moderate)", 3: "중증(Severe)" };
const SEVERITY: Record<PainLevel, { fill: string; stroke: string; chipBg: string; chipBorder: string; chipText: string }> = {
  1: { fill: "#fde047", stroke: "#ca8a04", chipBg: "bg-yellow-100", chipBorder: "border-yellow-400", chipText: "text-yellow-900" },
  2: { fill: "#f97316", stroke: "#c2410c", chipBg: "bg-orange-100", chipBorder: "border-orange-400", chipText: "text-orange-900" },
  3: { fill: "#ef4444", stroke: "#991b1b", chipBg: "bg-red-100", chipBorder: "border-red-400", chipText: "text-red-900" },
};

/* ─────────────────────────────────────────
   ANTERIOR (전면) parts
   ───────────────────────────────────────── */
const ANT: Part[] = [
  // Head & TMJ
  { kind: "ellipse", view: "anterior", name: "머리 및 안면", cx: 250, cy: 70, rx: 40, ry: 55 },
  { kind: "circle", view: "anterior", name: "우측 턱관절 (TMJ)", cx: 220, cy: 90, r: 12 },
  { kind: "circle", view: "anterior", name: "좌측 턱관절 (TMJ)", cx: 280, cy: 90, r: 12 },
  // SCM
  { kind: "polygon", view: "anterior", name: "우측 흉쇄유돌근", points: "230,110 245,145 235,145" },
  { kind: "polygon", view: "anterior", name: "좌측 흉쇄유돌근", points: "270,110 255,145 265,145" },
  // Sternum
  { kind: "rect", view: "anterior", name: "흉골", x: 246, y: 150, width: 8, height: 70, rx: 4 },
  // Pectoralis major
  { kind: "polygon", view: "anterior", name: "우측 대흉근", points: "246,150 180,150 160,220 246,230" },
  { kind: "polygon", view: "anterior", name: "좌측 대흉근", points: "254,150 320,150 340,220 254,230" },
  // Pectoralis minor (deep)
  { kind: "polygon", view: "anterior", name: "우측 소흉근 (심부)", deep: true, points: "215,160 195,175 205,195" },
  { kind: "polygon", view: "anterior", name: "좌측 소흉근 (심부)", deep: true, points: "285,160 305,175 295,195" },
  // Deltoid (front + lateral)
  { kind: "polygon", view: "anterior", name: "우측 전면 삼각근", points: "180,150 160,160 145,230 160,220" },
  { kind: "polygon", view: "anterior", name: "우측 측면 삼각근", points: "160,160 140,170 130,240 145,230" },
  { kind: "polygon", view: "anterior", name: "좌측 전면 삼각근", points: "320,150 340,160 355,230 340,220" },
  { kind: "polygon", view: "anterior", name: "좌측 측면 삼각근", points: "340,160 360,170 370,240 355,230" },
  // Biceps
  { kind: "polygon", view: "anterior", name: "우측 이두근", points: "130,240 110,330 140,330 160,220" },
  { kind: "polygon", view: "anterior", name: "좌측 이두근", points: "370,240 390,330 360,330 340,220" },
  // Medial epicondyle
  { kind: "circle", view: "anterior", name: "우측 안쪽 상과", cx: 145, cy: 335, r: 10 },
  { kind: "circle", view: "anterior", name: "좌측 안쪽 상과", cx: 355, cy: 335, r: 10 },
  // Forearms
  { kind: "polygon", view: "anterior", name: "우측 안쪽 전완", points: "140,340 120,440 140,440 150,340" },
  { kind: "polygon", view: "anterior", name: "우측 가쪽 전완", points: "110,340 90,440 120,440 130,340" },
  { kind: "polygon", view: "anterior", name: "좌측 안쪽 전완", points: "360,340 380,440 360,440 350,340" },
  { kind: "polygon", view: "anterior", name: "좌측 가쪽 전완", points: "390,340 410,440 380,440 370,340" },
  // Hands
  { kind: "polygon", view: "anterior", name: "우측 손", points: "90,450 70,520 110,520 120,450" },
  { kind: "polygon", view: "anterior", name: "좌측 손", points: "410,450 430,520 390,520 380,450" },
  // Rectus abdominis (6-pack, grouped)
  { kind: "rect", view: "anterior", name: "복직근", group: "rectus", x: 215, y: 235, width: 33, height: 35, rx: 5 },
  { kind: "rect", view: "anterior", name: "복직근", group: "rectus", x: 252, y: 235, width: 33, height: 35, rx: 5 },
  { kind: "rect", view: "anterior", name: "복직근", group: "rectus", x: 218, y: 275, width: 30, height: 40, rx: 5 },
  { kind: "rect", view: "anterior", name: "복직근", group: "rectus", x: 252, y: 275, width: 30, height: 40, rx: 5 },
  { kind: "rect", view: "anterior", name: "복직근", group: "rectus", x: 222, y: 320, width: 26, height: 45, rx: 5 },
  { kind: "rect", view: "anterior", name: "복직근", group: "rectus", x: 252, y: 320, width: 26, height: 45, rx: 5 },
  // Serratus / obliques
  { kind: "polygon", view: "anterior", name: "우측 전거근", points: "185,230 155,240 170,280 210,270" },
  { kind: "polygon", view: "anterior", name: "좌측 전거근", points: "315,230 345,240 330,280 290,270" },
  { kind: "polygon", view: "anterior", name: "우측 복사근", points: "210,275 165,285 180,360 220,360" },
  { kind: "polygon", view: "anterior", name: "좌측 복사근", points: "290,275 335,285 320,360 280,360" },
  // Iliopsoas (deep)
  { kind: "polygon", view: "anterior", name: "우측 장요근 (심부)", deep: true, points: "248,365 230,365 235,440 248,430" },
  { kind: "polygon", view: "anterior", name: "좌측 장요근 (심부)", deep: true, points: "252,365 270,365 265,440 252,430" },
  // ASIS
  { kind: "circle", view: "anterior", name: "우측 골반뼈 (ASIS)", cx: 195, cy: 380, r: 12 },
  { kind: "circle", view: "anterior", name: "좌측 골반뼈 (ASIS)", cx: 305, cy: 380, r: 12 },
  // Inguinal
  { kind: "polygon", view: "anterior", name: "우측 서혜부", points: "195,375 190,385 235,445 240,435" },
  { kind: "polygon", view: "anterior", name: "좌측 서혜부", points: "305,375 310,385 265,445 260,435" },
  // Quads / IT band
  { kind: "polygon", view: "anterior", name: "우측 대퇴사두근", points: "245,435 195,400 160,480 180,650 240,650" },
  { kind: "polygon", view: "anterior", name: "좌측 대퇴사두근", points: "255,435 305,400 340,480 320,650 260,650" },
  { kind: "polygon", view: "anterior", name: "우측 장경인대", points: "160,480 145,530 170,650 180,650" },
  { kind: "polygon", view: "anterior", name: "좌측 장경인대", points: "340,480 355,530 330,650 320,650" },
  // Patella (enlarged r=22)
  { kind: "circle", view: "anterior", name: "우측 무릎뼈 (Patella)", cx: 210, cy: 675, r: 22 },
  { kind: "circle", view: "anterior", name: "좌측 무릎뼈 (Patella)", cx: 290, cy: 675, r: 22 },
  // Lower leg (anterior)
  { kind: "polygon", view: "anterior", name: "우측 정강이뼈", points: "210,700 205,700 195,830 205,830" },
  { kind: "polygon", view: "anterior", name: "우측 전경골근", points: "205,700 170,700 185,830 195,830" },
  { kind: "polygon", view: "anterior", name: "우측 안쪽 종아리", points: "235,700 215,700 205,830 220,830" },
  { kind: "polygon", view: "anterior", name: "좌측 정강이뼈", points: "290,700 295,700 305,830 295,830" },
  { kind: "polygon", view: "anterior", name: "좌측 전경골근", points: "295,700 330,700 315,830 305,830" },
  { kind: "polygon", view: "anterior", name: "좌측 안쪽 종아리", points: "265,700 285,700 295,830 280,830" },
  // Dorsum of foot
  { kind: "polygon", view: "anterior", name: "우측 발등", points: "215,845 180,845 185,920 230,920" },
  { kind: "polygon", view: "anterior", name: "좌측 발등", points: "285,845 320,845 315,920 270,920" },
];

/* ─────────────────────────────────────────
   POSTERIOR (후면) parts
   주의: posterior view 에서는 "환자의 좌측" 이 보는 사람의 좌측에 옴
   (즉 거울 반전 X — 등 뒤에서 보는 방향 그대로)
   ───────────────────────────────────────── */
const POST: Part[] = [
  // Head
  { kind: "ellipse", view: "posterior", name: "머리 뒤통수", cx: 250, cy: 70, rx: 40, ry: 55 },
  // Spine
  { kind: "rect", view: "posterior", name: "경추", x: 247, y: 110, width: 6, height: 35, rx: 3 },
  { kind: "rect", view: "posterior", name: "흉추", x: 247, y: 150, width: 6, height: 170, rx: 3 },
  { kind: "rect", view: "posterior", name: "요추", x: 247, y: 325, width: 6, height: 50, rx: 3 },
  { kind: "polygon", view: "posterior", name: "천골", points: "250,380 242,385 250,420 258,385" },
  // Sub-occipital (deep)
  { kind: "rect", view: "posterior", name: "좌측 후두하근 (심부)", deep: true, x: 225, y: 110, width: 20, height: 20, rx: 4 },
  { kind: "rect", view: "posterior", name: "우측 후두하근 (심부)", deep: true, x: 255, y: 110, width: 20, height: 20, rx: 4 },
  // Neck (deep)
  { kind: "polygon", view: "posterior", name: "좌측 목 근육", deep: true, points: "245,135 225,135 230,160 245,160" },
  { kind: "polygon", view: "posterior", name: "우측 목 근육", deep: true, points: "255,135 275,135 270,160 255,160" },
  // Upper trapezius
  { kind: "polygon", view: "posterior", name: "좌측 상부승모근", points: "245,145 200,155 170,165 245,185" },
  { kind: "polygon", view: "posterior", name: "우측 상부승모근", points: "255,145 300,155 330,165 255,185" },
  // Scapular landmarks (left = patient's left = viewer's left)
  { kind: "circle", view: "posterior", name: "좌측 견갑골 상각", cx: 202, cy: 165, r: 12 },
  { kind: "polygon", view: "posterior", name: "좌측 견갑골 내측연", points: "215,170 220,230 195,230 190,170" },
  { kind: "circle", view: "posterior", name: "좌측 견갑골 하각", cx: 207, cy: 240, r: 12 },
  { kind: "polygon", view: "posterior", name: "좌측 극상근", points: "190,165 160,170 170,185 195,180" },
  { kind: "polygon", view: "posterior", name: "좌측 극하근", points: "195,180 165,190 180,230 195,230" },
  // Right side
  { kind: "circle", view: "posterior", name: "우측 견갑골 상각", cx: 298, cy: 165, r: 12 },
  { kind: "polygon", view: "posterior", name: "우측 견갑골 내측연", points: "285,170 280,230 305,230 310,170" },
  { kind: "circle", view: "posterior", name: "우측 견갑골 하각", cx: 293, cy: 240, r: 12 },
  { kind: "polygon", view: "posterior", name: "우측 극상근", points: "310,165 340,170 330,185 305,180" },
  { kind: "polygon", view: "posterior", name: "우측 극하근", points: "305,180 335,190 320,230 305,230" },
  // Posterior deltoid
  { kind: "polygon", view: "posterior", name: "좌측 후면 삼각근", points: "160,165 140,180 150,230 170,190" },
  { kind: "polygon", view: "posterior", name: "우측 후면 삼각근", points: "340,165 360,180 350,230 330,190" },
  // Triceps
  { kind: "polygon", view: "posterior", name: "좌측 삼두근", points: "150,230 120,330 150,330 170,230" },
  { kind: "polygon", view: "posterior", name: "우측 삼두근", points: "350,230 380,330 350,330 330,230" },
  // Lateral epicondyle
  { kind: "circle", view: "posterior", name: "좌측 가쪽 상과", cx: 120, cy: 335, r: 10 },
  { kind: "circle", view: "posterior", name: "우측 가쪽 상과", cx: 380, cy: 335, r: 10 },
  // Posterior forearm
  { kind: "polygon", view: "posterior", name: "좌측 안쪽 전완", points: "150,340 130,440 150,440 160,340" },
  { kind: "polygon", view: "posterior", name: "좌측 가쪽 전완", points: "120,340 100,440 130,440 140,340" },
  { kind: "polygon", view: "posterior", name: "우측 안쪽 전완", points: "350,340 370,440 350,440 340,340" },
  { kind: "polygon", view: "posterior", name: "우측 가쪽 전완", points: "380,340 400,440 370,440 360,340" },
  // Dorsal hand
  { kind: "polygon", view: "posterior", name: "좌측 손등", points: "100,450 80,520 120,520 130,450" },
  { kind: "polygon", view: "posterior", name: "우측 손등", points: "400,450 420,520 380,520 370,450" },
  // Lats
  { kind: "polygon", view: "posterior", name: "좌측 광배근", points: "245,190 205,240 165,290 245,340" },
  { kind: "polygon", view: "posterior", name: "우측 광배근", points: "255,190 295,240 335,290 255,340" },
  // Erector spinae (deep)
  { kind: "rect", view: "posterior", name: "좌측 흉요추 기립근", deep: true, x: 230, y: 190, width: 14, height: 135, rx: 4 },
  { kind: "rect", view: "posterior", name: "우측 흉요추 기립근", deep: true, x: 256, y: 190, width: 14, height: 135, rx: 4 },
  // QL (deep)
  { kind: "polygon", view: "posterior", name: "좌측 요방형근 (심부)", deep: true, points: "245,330 215,335 220,370 245,370" },
  { kind: "polygon", view: "posterior", name: "우측 요방형근 (심부)", deep: true, points: "255,330 285,335 280,370 255,370" },
  // PSIS
  { kind: "circle", view: "posterior", name: "좌측 PSIS", cx: 225, cy: 380, r: 10 },
  { kind: "circle", view: "posterior", name: "우측 PSIS", cx: 275, cy: 380, r: 10 },
  // Glute med
  { kind: "polygon", view: "posterior", name: "좌측 중둔근", points: "215,370 170,390 185,420 220,395" },
  { kind: "polygon", view: "posterior", name: "우측 중둔근", points: "285,370 330,390 315,420 280,395" },
  // Glute max + piriformis (deep)
  { kind: "path", view: "posterior", name: "좌측 대둔근", fillRule: "evenodd", d: "M 245,385 L 210,395 L 170,460 L 245,475 Z M 215,420 A 12 12 0 1 0 215 444 A 12 12 0 1 0 215 420 Z" },
  { kind: "circle", view: "posterior", name: "좌측 이상근 (심부)", deep: true, cx: 215, cy: 432, r: 12 },
  { kind: "path", view: "posterior", name: "우측 대둔근", fillRule: "evenodd", d: "M 255,385 L 290,395 L 330,460 L 255,475 Z M 285,420 A 12 12 0 1 0 285 444 A 12 12 0 1 0 285 420 Z" },
  { kind: "circle", view: "posterior", name: "우측 이상근 (심부)", deep: true, cx: 285, cy: 432, r: 12 },
  // Hamstrings
  { kind: "polygon", view: "posterior", name: "좌측 안쪽 햄스트링", points: "242,480 210,480 220,660 238,660" },
  { kind: "polygon", view: "posterior", name: "좌측 가쪽 햄스트링", points: "205,480 175,480 195,660 215,660" },
  { kind: "polygon", view: "posterior", name: "우측 안쪽 햄스트링", points: "258,480 290,480 280,660 262,660" },
  { kind: "polygon", view: "posterior", name: "우측 가쪽 햄스트링", points: "295,480 325,480 305,660 285,660" },
  // Popliteal (deep)
  { kind: "ellipse", view: "posterior", name: "좌측 오금", deep: true, cx: 220, cy: 675, rx: 18, ry: 12 },
  { kind: "ellipse", view: "posterior", name: "우측 오금", deep: true, cx: 280, cy: 675, rx: 18, ry: 12 },
  // Calves
  { kind: "polygon", view: "posterior", name: "좌측 안쪽 종아리", points: "238,690 220,690 215,800 230,800" },
  { kind: "polygon", view: "posterior", name: "좌측 가쪽 종아리", points: "215,690 190,690 205,800 210,800" },
  { kind: "polygon", view: "posterior", name: "우측 안쪽 종아리", points: "262,690 280,690 285,800 270,800" },
  { kind: "polygon", view: "posterior", name: "우측 가쪽 종아리", points: "285,690 310,690 295,800 290,800" },
  // Achilles
  { kind: "polygon", view: "posterior", name: "좌측 아킬레스건", points: "225,805 210,805 210,860 225,860" },
  { kind: "polygon", view: "posterior", name: "우측 아킬레스건", points: "275,805 290,805 290,860 275,860" },
  // Heel & sole
  { kind: "polygon", view: "posterior", name: "좌측 발뒤꿈치", points: "230,870 205,870 200,890 235,890" },
  { kind: "polygon", view: "posterior", name: "좌측 앞발바닥", points: "235,890 200,890 195,930 240,930" },
  { kind: "polygon", view: "posterior", name: "우측 발뒤꿈치", points: "270,870 295,870 300,890 265,890" },
  { kind: "polygon", view: "posterior", name: "우측 앞발바닥", points: "265,890 300,890 305,930 260,930" },
];

/* ════════════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════════════ */

const keyOf = (view: PainView, region: string) => `${view}::${region}`;

/** entries → Map<key, level> */
function buildLevelMap(entries: PainEntry[]): Map<string, PainLevel> {
  const m = new Map<string, PainLevel>();
  for (const e of entries) m.set(keyOf(e.view, e.region), e.painLevel);
  return m;
}

/** 작은 도형(직경 14 미만)에는 라벨 안 그림 */
function shouldRenderLabel(p: Part): boolean {
  switch (p.kind) {
    case "circle": return p.r >= 7;
    case "ellipse": return p.rx >= 7 && p.ry >= 7;
    case "rect": return p.width >= 14 && p.height >= 14;
    default: return true; // polygon/path는 너무 작은 경우 드물어서 항상 시도
  }
}

/** 도형의 중심 좌표 (라벨 위치용) */
function centerOf(p: Part): { x: number; y: number } | null {
  switch (p.kind) {
    case "circle":
    case "ellipse":
      return { x: p.cx, y: p.cy };
    case "rect":
      return { x: p.x + p.width / 2, y: p.y + p.height / 2 };
    case "polygon": {
      const coords = p.points.split(/[\s,]+/).map(Number);
      let sx = 0, sy = 0, n = 0;
      for (let i = 0; i + 1 < coords.length; i += 2) {
        sx += coords[i]; sy += coords[i + 1]; n++;
      }
      return n > 0 ? { x: sx / n, y: sy / n } : null;
    }
    case "path":
      // path는 중심 계산이 복잡해서 라벨 생략 (대둔근만 해당)
      return null;
  }
}

/* ════════════════════════════════════════════════════════
   Component
   ════════════════════════════════════════════════════════ */

export type BodyDiagramProps = {
  value?: PainEntry[];
  onChange?: (entries: PainEntry[]) => void;
};

export default function BodyDiagram({ value, onChange }: BodyDiagramProps) {
  const [internal, setInternal] = useState<PainEntry[]>([]);
  const controlled = value !== undefined && onChange !== undefined;
  const entries = controlled ? value! : internal;
  const setEntries = controlled ? onChange! : setInternal;

  const levelMap = useMemo(() => buildLevelMap(entries), [entries]);

  /* 0→1→2→3→0 사이클 토글 (그룹은 동시 토글) */
  const toggle = (view: PainView, region: string, group?: string) => {
    const targets = group
      ? [...ANT, ...POST].filter((p) => p.group === group).map((p) => ({ view: p.view, region: p.name }))
      : [{ view, region }];
    // 첫 타겟의 현재 단계 → 다음 단계
    const cur = levelMap.get(keyOf(targets[0].view, targets[0].region)) ?? 0;
    const next = ((cur + 1) % 4) as 0 | PainLevel;

    // 모든 타겟에 동일 단계 적용
    const targetKeys = new Set(targets.map((t) => keyOf(t.view, t.region)));
    const remaining = entries.filter((e) => !targetKeys.has(keyOf(e.view, e.region)));
    if (next === 0) {
      setEntries(remaining);
    } else {
      const additions: PainEntry[] = targets.map((t) => ({ view: t.view, region: t.region, painLevel: next }));
      setEntries([...remaining, ...additions]);
    }
  };

  /* 단일 부위 삭제 (요약 패널의 × 버튼) */
  const remove = (view: PainView, region: string) => {
    setEntries(entries.filter((e) => !(e.view === view && e.region === region)));
  };

  /* 전체 초기화 */
  const reset = () => {
    if (entries.length === 0) return;
    if (typeof window !== "undefined" && !window.confirm("모든 통증 기록을 초기화하시겠습니까?")) return;
    setEntries([]);
  };

  const counts = useMemo(() => {
    const c: Record<PainLevel, number> = { 1: 0, 2: 0, 3: 0 };
    for (const e of entries) c[e.painLevel]++;
    // 중복 부위(그룹) 제거된 카운트
    const unique = new Set(entries.map((e) => keyOf(e.view, e.region)));
    return { ...c, total: unique.size };
  }, [entries]);

  const sorted = useMemo(() => {
    // 강도 내림차순 → 전면 → 후면 → DOM 순 (Part 배열 순서)
    const partOrder = new Map<string, number>();
    [...ANT, ...POST].forEach((p, i) => {
      const k = keyOf(p.view, p.name);
      if (!partOrder.has(k)) partOrder.set(k, i);
    });
    const seen = new Set<string>();
    const list = entries
      .filter((e) => {
        const k = keyOf(e.view, e.region);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .sort((a, b) => {
        if (b.painLevel !== a.painLevel) return b.painLevel - a.painLevel;
        if (a.view !== b.view) return a.view === "anterior" ? -1 : 1;
        return (partOrder.get(keyOf(a.view, a.region)) ?? 0) - (partOrder.get(keyOf(b.view, b.region)) ?? 0);
      });
    return list;
  }, [entries]);

  return (
    <div className="select-none w-full max-w-5xl mx-auto flex flex-col my-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">통증 부위 기록</h3>
            <p className="text-xs text-slate-500 mt-0.5">부위를 클릭하세요 (1단계 → 2단계 → 3단계 → 정상)</p>
          </div>
          <button
            type="button"
            onClick={reset}
            disabled={entries.length === 0}
            className="self-start md:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw size={14} />
            전체 초기화
          </button>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm bg-[#e2e8f0] border border-[#64748b]" />정상 (0)</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm bg-[#fde047] border border-[#ca8a04]" />경도 (1)</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm bg-[#f97316] border border-[#c2410c]" />중등도 (2)</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm bg-[#ef4444] border border-[#991b1b]" />중증 (3)</span>
          <span className="text-slate-400 ml-auto hidden md:inline">점선 = 심부 근육 / 도형 위 숫자 = 강도 단계</span>
        </div>
        {/* Live badge */}
        {counts.total > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-xs mt-2.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg">
            <span className="font-semibold text-indigo-900">기록된 부위 {counts.total}개</span>
            <span className="text-indigo-300">·</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ef4444]" />중증 {counts[3]}</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f97316]" />중등도 {counts[2]}</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#fde047] border border-[#ca8a04]" />경도 {counts[1]}</span>
          </div>
        )}
      </div>

      {/* Two diagrams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <DiagramSvg view="anterior" parts={ANT} levelMap={levelMap} onToggle={toggle} />
        <DiagramSvg view="posterior" parts={POST} levelMap={levelMap} onToggle={toggle} />
      </div>

      {/* Summary list */}
      {sorted.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-800">기록된 통증 부위</h4>
            <span className="text-xs text-slate-400">[×] 한 부위만 삭제</span>
          </div>
          {([3, 2, 1] as PainLevel[]).map((lvl) => {
            const items = sorted.filter((e) => e.painLevel === lvl);
            if (items.length === 0) return null;
            const sev = SEVERITY[lvl];
            return (
              <div key={lvl} className="mb-3 last:mb-0">
                <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-slate-100">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: sev.fill, borderColor: sev.stroke, borderWidth: 1 }} />
                  <span className="font-semibold text-xs text-slate-800">{PAIN_LABEL[lvl]} ({lvl})</span>
                  <span className="text-xs text-slate-400">— {items.length}개</span>
                </div>
                <ul className="space-y-0.5">
                  {items.map((e) => (
                    <li key={keyOf(e.view, e.region)} className="flex items-center justify-between gap-2 py-1 px-1.5 hover:bg-slate-50 rounded text-xs">
                      <span className="text-slate-700 truncate">
                        <span className="text-slate-400 mr-1.5">[{e.view === "anterior" ? "전면" : "후면"}]</span>{e.region}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(e.view, e.region)}
                        className="shrink-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded w-6 h-6 flex items-center justify-center transition text-base leading-none"
                        aria-label={`${e.region} 기록 삭제`}
                        title="이 부위 기록 삭제"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   DiagramSvg — 단일 view (전면 또는 후면)
   ───────────────────────────────────────── */

function DiagramSvg({
  view,
  parts,
  levelMap,
  onToggle,
}: {
  view: PainView;
  parts: Part[];
  levelMap: Map<string, PainLevel>;
  onToggle: (view: PainView, region: string, group?: string) => void;
}) {
  const title = view === "anterior" ? "전면 (Anterior)" : "후면 (Posterior)";
  const lr = view === "anterior"
    ? { left: "R (환자 우측)", right: "L (환자 좌측)" }
    : { left: "L (환자 좌측)", right: "R (환자 우측)" };

  const renderShape = (p: Part, idx: number) => {
    const key = keyOf(p.view, p.name);
    const level = levelMap.get(key);
    const fill = level ? SEVERITY[level].fill : (p.deep ? "rgba(203,213,225,0.5)" : "#e2e8f0");
    const stroke = level ? SEVERITY[level].stroke : (p.deep ? "#475569" : "#64748b");
    const strokeWidth = level ? 3 + level * 0.5 : 2;
    const dashArray = !level && p.deep ? "4,3" : undefined;

    const common = {
      fill,
      stroke,
      strokeWidth,
      strokeDasharray: dashArray,
      strokeLinejoin: "round" as const,
      strokeLinecap: "round" as const,
      style: { cursor: "pointer" as const, transition: "fill 0.15s ease, stroke 0.15s ease, stroke-width 0.15s ease" },
      onClick: (e: React.MouseEvent) => { e.preventDefault(); onToggle(p.view, p.name, p.group); },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(p.view, p.name, p.group);
        }
      },
      tabIndex: 0,
      role: "button",
      "aria-label": p.name,
      "aria-pressed": level ? "true" : "false",
    } as const;

    switch (p.kind) {
      case "circle":
        return <circle key={idx} cx={p.cx} cy={p.cy} r={p.r} {...common}><title>{p.name}</title></circle>;
      case "ellipse":
        return <ellipse key={idx} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} {...common}><title>{p.name}</title></ellipse>;
      case "rect":
        return <rect key={idx} x={p.x} y={p.y} width={p.width} height={p.height} rx={p.rx} {...common}><title>{p.name}</title></rect>;
      case "polygon":
        return <polygon key={idx} points={p.points} {...common}><title>{p.name}</title></polygon>;
      case "path":
        return <path key={idx} d={p.d} fillRule={p.fillRule} {...common}><title>{p.name}</title></path>;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 relative overflow-hidden flex flex-col items-center">
      <h2 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1 self-start ml-2">{title}</h2>
      <svg viewBox="0 0 500 950" className="w-full h-auto max-h-[70vh]" aria-label={title} role="img">
        <line x1={250} y1={0} x2={250} y2={950} stroke="#f1f5f9" strokeWidth={2} strokeDasharray="8,8" />
        <text x={50} y={25} fontSize={12} fontWeight={700} fill="#94a3b8" letterSpacing={1}>{lr.left}</text>
        <text x={360} y={25} fontSize={12} fontWeight={700} fill="#94a3b8" letterSpacing={1}>{lr.right}</text>
        {parts.map(renderShape)}
        {/* 통증 단계 숫자 라벨 (색약 대응) */}
        {parts.map((p, i) => {
          const level = levelMap.get(keyOf(p.view, p.name));
          if (!level) return null;
          if (!shouldRenderLabel(p)) return null;
          const c = centerOf(p);
          if (!c) return null;
          return (
            <text
              key={`lbl-${i}`}
              x={c.x}
              y={c.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={14}
              fontWeight={800}
              fill="#fff"
              stroke="rgba(15,23,42,0.85)"
              strokeWidth={3}
              paintOrder="stroke fill"
              pointerEvents="none"
              aria-hidden
            >
              {level}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
