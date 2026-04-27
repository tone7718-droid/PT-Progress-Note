"use client";

import React, { useState } from "react";
import { RotateCw, CheckCircle2 } from "lucide-react";

type Part = { id: string; name: string; d: string };

/* ────────────────────────────────────────────
   ANTERIOR  –  28 anatomical zones
   viewBox 0 0 500 960
   ──────────────────────────────────────────── */
const ANT: Part[] = [
  // ── Head & Neck ──
  { id: "head_a", name: "머리 (Head)",
    d: "M250 22 C222 22,202 42,200 68 C198 94,210 114,224 124 C232 130,242 134,250 134 C258 134,268 130,276 124 C290 114,302 94,300 68 C298 42,278 22,250 22 Z" },
  { id: "neck_a", name: "목 (Neck)",
    d: "M232 132 C228 142,222 150,216 156 L284 156 C278 150,272 142,268 132 C262 136,256 138,250 138 C244 138,238 136,232 132 Z" },

  // ── Shoulders ──
  { id: "r_delt_a", name: "우측 삼각근 (R Deltoid)",
    d: "M214 156 C190 148,162 148,142 164 C124 180,118 204,122 222 C128 234,140 244,152 248 C162 228,172 198,192 172 L214 156 Z" },
  { id: "l_delt_a", name: "좌측 삼각근 (L Deltoid)",
    d: "M286 156 C310 148,338 148,358 164 C376 180,382 204,378 222 C372 234,360 244,348 248 C338 228,328 198,308 172 L286 156 Z" },

  // ── Chest ──
  { id: "r_pec_a", name: "우측 대흉근 (R Pectoralis)",
    d: "M248 158 C238 158,218 160,206 170 C188 184,178 206,180 224 C184 238,198 248,216 252 C234 256,248 254,248 244 Z" },
  { id: "l_pec_a", name: "좌측 대흉근 (L Pectoralis)",
    d: "M252 158 C262 158,282 160,294 170 C312 184,322 206,320 224 C316 238,302 248,284 252 C266 256,252 254,252 244 Z" },

  // ── Abdomen ──
  { id: "abs_a", name: "복근 (Abdomen)",
    d: "M218 256 C228 250,240 248,250 248 C260 248,272 250,282 256 C290 286,292 316,288 342 C284 358,270 370,250 372 C230 370,216 358,212 342 C208 316,210 286,218 256 Z" },

  // ── Upper Arms ──
  { id: "r_bicep_a", name: "우측 이두근 (R Bicep)",
    d: "M150 252 C138 266,126 296,122 326 C120 348,124 362,134 370 C146 376,156 368,162 352 C168 330,170 296,178 262 C170 254,158 250,150 252 Z" },
  { id: "l_bicep_a", name: "좌측 이두근 (L Bicep)",
    d: "M350 252 C362 266,374 296,378 326 C380 348,376 362,366 370 C354 376,344 368,338 352 C332 330,330 296,322 262 C330 254,342 250,350 252 Z" },

  // ── Forearms ──
  { id: "r_forearm_a", name: "우측 전완 (R Forearm)",
    d: "M130 374 C118 404,108 444,106 468 C104 486,108 496,118 498 C128 498,140 486,146 460 C152 434,156 404,158 382 C150 378,138 376,130 374 Z" },
  { id: "l_forearm_a", name: "좌측 전완 (L Forearm)",
    d: "M370 374 C382 404,392 444,394 468 C396 486,392 496,382 498 C372 498,360 486,354 460 C348 434,344 404,342 382 C350 378,362 376,370 374 Z" },

  // ── Hands ──
  { id: "r_hand_a", name: "우측 손 (R Hand)",
    d: "M114 502 C104 520,96 548,100 564 C104 574,112 576,118 570 C124 560,128 536,132 510 C126 506,118 504,114 502 Z" },
  { id: "l_hand_a", name: "좌측 손 (L Hand)",
    d: "M386 502 C396 520,404 548,400 564 C396 574,388 576,382 570 C376 560,372 536,368 510 C374 506,382 504,386 502 Z" },

  // ── Hip / Groin ──
  { id: "r_groin_a", name: "우측 서혜부/장요근 (R Hip)",
    d: "M210 346 C196 356,184 374,178 400 C174 420,172 436,174 448 L248 448 L248 374 C238 370,224 362,210 346 Z" },
  { id: "l_groin_a", name: "좌측 서혜부/장요근 (L Hip)",
    d: "M290 346 C304 356,316 374,322 400 C326 420,328 436,326 448 L252 448 L252 374 C262 370,276 362,290 346 Z" },

  // ── Thighs ──
  { id: "r_quad_a", name: "우측 대퇴사두근 (R Quadriceps)",
    d: "M170 452 C156 490,148 540,156 590 C162 624,178 648,198 658 C218 664,238 662,248 656 L248 452 Z" },
  { id: "l_quad_a", name: "좌측 대퇴사두근 (L Quadriceps)",
    d: "M330 452 C344 490,352 540,344 590 C338 624,322 648,302 658 C282 664,262 662,252 656 L252 452 Z" },

  // ── Knees ──
  { id: "r_knee_a", name: "우측 슬관절 (R Knee)",
    d: "M194 662 C184 674,182 692,192 702 C202 710,224 714,248 712 L248 660 C236 664,214 666,194 662 Z" },
  { id: "l_knee_a", name: "좌측 슬관절 (L Knee)",
    d: "M306 662 C316 674,318 692,308 702 C298 710,276 714,252 712 L252 660 C264 664,286 666,306 662 Z" },

  // ── Shins ──
  { id: "r_tib_a", name: "우측 전경골근 (R Tibialis)",
    d: "M190 706 C178 740,176 790,186 828 C192 846,204 856,218 858 C232 860,244 856,248 848 L248 716 C234 718,210 714,190 706 Z" },
  { id: "l_tib_a", name: "좌측 전경골근 (L Tibialis)",
    d: "M310 706 C322 740,324 790,314 828 C308 846,296 856,282 858 C268 860,256 856,252 848 L252 716 C266 718,290 714,310 706 Z" },

  // ── Feet ──
  { id: "r_foot_a", name: "우측 발 (R Foot)",
    d: "M184 862 C172 878,164 904,170 924 C176 938,196 948,218 946 C234 944,244 934,248 918 C248 898,244 878,238 866 C228 862,206 862,184 862 Z" },
  { id: "l_foot_a", name: "좌측 발 (L Foot)",
    d: "M316 862 C328 878,336 904,330 924 C324 938,304 948,282 946 C266 944,256 934,252 918 C252 898,256 878,262 866 C272 862,294 862,316 862 Z" },
];

/* ────────────────────────────────────────────
   POSTERIOR  –  28 anatomical zones
   ──────────────────────────────────────────── */
const POST: Part[] = [
  // ── Head & Neck ──
  { id: "head_p", name: "뒤통수 (Occiput)",
    d: "M250 22 C222 22,202 42,200 68 C198 94,210 114,224 124 C232 130,242 134,250 134 C258 134,268 130,276 124 C290 114,302 94,300 68 C298 42,278 22,250 22 Z" },
  { id: "neck_p", name: "경추 (Cervical)",
    d: "M232 132 C228 142,222 150,216 156 L284 156 C278 150,272 142,268 132 C262 136,256 138,250 138 C244 138,238 136,232 132 Z" },

  // ── Shoulders ──
  { id: "l_delt_p", name: "좌측 후면 삼각근 (L Deltoid)",
    d: "M214 156 C190 148,162 148,142 164 C124 180,118 204,122 222 C128 234,140 244,152 248 C162 228,172 198,192 172 L214 156 Z" },
  { id: "r_delt_p", name: "우측 후면 삼각근 (R Deltoid)",
    d: "M286 156 C310 148,338 148,358 164 C376 180,382 204,378 222 C372 234,360 244,348 248 C338 228,328 198,308 172 L286 156 Z" },

  // ── Upper Back ──
  { id: "l_trap", name: "좌측 승모근/등상부 (L Trapezius)",
    d: "M248 158 C238 158,218 160,206 170 C188 184,178 206,180 224 C184 238,198 248,216 252 C234 256,248 254,248 244 Z" },
  { id: "r_trap", name: "우측 승모근/등상부 (R Trapezius)",
    d: "M252 158 C262 158,282 160,294 170 C312 184,322 206,320 224 C316 238,302 248,284 252 C266 256,252 254,252 244 Z" },

  // ── Lower Back ──
  { id: "lback_p", name: "요추/허리 (Lumbar)",
    d: "M218 256 C228 250,240 248,250 248 C260 248,272 250,282 256 C290 286,292 316,288 342 C284 358,270 370,250 372 C230 370,216 358,212 342 C208 316,210 286,218 256 Z" },

  // ── Upper Arms ──
  { id: "l_tri_p", name: "좌측 삼두근 (L Tricep)",
    d: "M150 252 C138 266,126 296,122 326 C120 348,124 362,134 370 C146 376,156 368,162 352 C168 330,170 296,178 262 C170 254,158 250,150 252 Z" },
  { id: "r_tri_p", name: "우측 삼두근 (R Tricep)",
    d: "M350 252 C362 266,374 296,378 326 C380 348,376 362,366 370 C354 376,344 368,338 352 C332 330,330 296,322 262 C330 254,342 250,350 252 Z" },

  // ── Forearms ──
  { id: "l_fa_p", name: "좌측 후면 전완 (L Forearm)",
    d: "M130 374 C118 404,108 444,106 468 C104 486,108 496,118 498 C128 498,140 486,146 460 C152 434,156 404,158 382 C150 378,138 376,130 374 Z" },
  { id: "r_fa_p", name: "우측 후면 전완 (R Forearm)",
    d: "M370 374 C382 404,392 444,394 468 C396 486,392 496,382 498 C372 498,360 486,354 460 C348 434,344 404,342 382 C350 378,362 376,370 374 Z" },

  // ── Hands ──
  { id: "l_hand_p", name: "좌측 손등 (L Hand)",
    d: "M114 502 C104 520,96 548,100 564 C104 574,112 576,118 570 C124 560,128 536,132 510 C126 506,118 504,114 502 Z" },
  { id: "r_hand_p", name: "우측 손등 (R Hand)",
    d: "M386 502 C396 520,404 548,400 564 C396 574,388 576,382 570 C376 560,372 536,368 510 C374 506,382 504,386 502 Z" },

  // ── Glutes ──
  { id: "l_glute_p", name: "좌측 둔근 (L Gluteus)",
    d: "M210 346 C196 356,184 374,178 400 C174 420,172 436,174 448 L248 448 L248 374 C238 370,224 362,210 346 Z" },
  { id: "r_glute_p", name: "우측 둔근 (R Gluteus)",
    d: "M290 346 C304 356,316 374,322 400 C326 420,328 436,326 448 L252 448 L252 374 C262 370,276 362,290 346 Z" },

  // ── Hamstrings ──
  { id: "l_ham_p", name: "좌측 햄스트링 (L Hamstring)",
    d: "M170 452 C156 490,148 540,156 590 C162 624,178 648,198 658 C218 664,238 662,248 656 L248 452 Z" },
  { id: "r_ham_p", name: "우측 햄스트링 (R Hamstring)",
    d: "M330 452 C344 490,352 540,344 590 C338 624,322 648,302 658 C282 664,262 662,252 656 L252 452 Z" },

  // ── Popliteal ──
  { id: "l_pop_p", name: "좌측 오금 (L Popliteal)",
    d: "M194 662 C184 674,182 692,192 702 C202 710,224 714,248 712 L248 660 C236 664,214 666,194 662 Z" },
  { id: "r_pop_p", name: "우측 오금 (R Popliteal)",
    d: "M306 662 C316 674,318 692,308 702 C298 710,276 714,252 712 L252 660 C264 664,286 666,306 662 Z" },

  // ── Calves ──
  { id: "l_calf_p", name: "좌측 비복근 (L Gastrocnemius)",
    d: "M190 706 C178 740,176 790,186 828 C192 846,204 856,218 858 C232 860,244 856,248 848 L248 716 C234 718,210 714,190 706 Z" },
  { id: "r_calf_p", name: "우측 비복근 (R Gastrocnemius)",
    d: "M310 706 C322 740,324 790,314 828 C308 846,296 856,282 858 C268 860,256 856,252 848 L252 716 C266 718,290 714,310 706 Z" },

  // ── Feet ──
  { id: "l_sole_p", name: "좌측 발바닥 (L Sole)",
    d: "M184 862 C172 878,164 904,170 924 C176 938,196 948,218 946 C234 944,244 934,248 918 C248 898,244 878,238 866 C228 862,206 862,184 862 Z" },
  { id: "r_sole_p", name: "우측 발바닥 (R Sole)",
    d: "M316 862 C328 878,336 904,330 924 C324 938,304 948,282 946 C266 944,256 934,252 918 C252 898,256 878,262 866 C272 862,294 862,316 862 Z" },
];

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────
export type BodyDiagramProps = {
  painAreas?: string[];
  setPainAreas?: (a: string[]) => void;
};

export default function BodyDiagram({ painAreas: ext, setPainAreas: setExt }: BodyDiagramProps) {
  const [local, setLocal] = useState<string[]>([]);
  const [view, setView] = useState<"anterior" | "posterior">("anterior");

  const ctrl = ext !== undefined && setExt !== undefined;
  const areas = ctrl ? ext : local;
  const set   = ctrl ? setExt : setLocal;

  const toggle = (id: string) =>
    areas.includes(id) ? set(areas.filter(p => p !== id)) : set([...areas, id]);
  const remove = (id: string) => set(areas.filter(p => p !== id));

  const parts = view === "anterior" ? ANT : POST;
  const all   = [...ANT, ...POST];

  return (
    <div className="select-none w-full max-w-[240px] mx-auto flex flex-col items-center my-6">
      <div className="flex justify-between items-center mb-4 w-full px-1">
        <p className="text-sm font-bold text-gray-500">📌 통증 부위 선택</p>
        <button
          type="button"
          onClick={() => setView(v => v === "anterior" ? "posterior" : "anterior")}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors ring-1 ring-gray-300 shadow-sm shrink-0"
        >
          <RotateCw size={14} />
          {view === "anterior" ? "후면" : "전면"}
        </button>
      </div>

      {/* Diagram Card */}
      <div className="flex flex-col items-center w-full bg-white rounded-2xl py-4 shadow-sm border border-gray-100">
        <div className="w-full max-w-[240px] aspect-[1/2] mx-auto">
          <svg viewBox="0 0 500 960" className="w-full h-full drop-shadow-md">
            <defs>
              <filter id="sel-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="b" />
                <feComposite in="SourceGraphic" in2="b" operator="over" />
              </filter>
            </defs>

            <text x="250" y="16" textAnchor="middle" className="text-base font-black fill-gray-300 uppercase tracking-[.25em]">
              {view === "anterior" ? "Anterior" : "Posterior"}
            </text>

            {parts.map(p => {
              const on = areas.includes(p.id);
              return (
                <path
                  key={p.id}
                  d={p.d}
                  fill={on ? "#ef4444" : "#9B1C2C"}
                  stroke="#fff"
                  strokeWidth={on ? 3 : 1.8}
                  strokeLinejoin="round"
                  filter={on ? "url(#sel-glow)" : undefined}
                  className={`cursor-pointer transition-all duration-200 ${on ? "" : "hover:opacity-75 active:opacity-50"}`}
                  style={{ transformBox: "fill-box", transformOrigin: "center", transform: on ? "scale(1.025)" : undefined }}
                  onClick={e => { e.preventDefault(); toggle(p.id); }}
                  onTouchEnd={e => { e.preventDefault(); toggle(p.id); }}
                  role="button"
                  aria-label={p.name}
                  aria-pressed={on ? "true" : "false"}
                />
              );
            })}
          </svg>
        </div>

        {/* Chips */}
        <div className="w-full mt-6 bg-white rounded-lg border border-red-100 p-4 shadow-sm min-h-[3.5rem]">
          <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-red-500" />
            선택된 부위 ({areas.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {areas.length === 0
              ? <span className="text-sm text-gray-400 italic">선택된 통증 부위가 없습니다.</span>
              : areas.map(id => {
                  const p = all.find(x => x.id === id);
                  return p ? (
                    <span key={id} className="inline-flex items-center gap-1 bg-red-50 text-red-800 px-3 py-1 rounded-full text-xs font-bold border border-red-200 shadow-sm hover:bg-red-100 transition-colors">
                      {p.name}
                      <button type="button" onClick={() => remove(id)} className="ml-0.5 text-red-400 hover:text-red-600" aria-label={`${p.name} 선택 취소`}>&times;</button>
                    </span>
                  ) : null;
                })
            }
          </div>
        </div>
      </div>
    </div>
  );
}
