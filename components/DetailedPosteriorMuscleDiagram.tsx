"use client";

import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";

type Part = { id: string; name: string; d: string };

const POSTERIOR_MUSCLES: Part[] = [
  { id: "l_trap_upper", name: "좌측 상부 승모근 (L Upper Trapezius)",
    d: "M250 120 C240 90, 230 70, 220 70 C200 90, 160 130, 140 160 C180 160, 210 180, 210 200 Z" },
  { id: "r_trap_upper", name: "우측 상부 승모근 (R Upper Trapezius)",
    d: "M250 120 C260 90, 270 70, 280 70 C300 90, 340 130, 360 160 C320 160, 290 180, 290 200 Z" },
  { id: "l_trap_lower", name: "좌측 중/하부 승모근 (L Mid/Lower Trapezius)",
    d: "M250 150 C240 160, 220 180, 210 200 C210 220, 220 280, 250 350 Z" },
  { id: "r_trap_lower", name: "우측 중/하부 승모근 (R Mid/Lower Trapezius)",
    d: "M250 150 C260 160, 280 180, 290 200 C290 220, 280 280, 250 350 Z" },
  { id: "l_deltoid", name: "좌측 삼각근 (L Deltoid)",
    d: "M140 160 C120 170, 100 210, 110 250 C130 260, 140 240, 150 220 C170 210, 210 200, 210 200 C180 160, 140 160, 140 160 Z" },
  { id: "r_deltoid", name: "우측 삼각근 (R Deltoid)",
    d: "M360 160 C380 170, 400 210, 390 250 C370 260, 360 240, 350 220 C330 210, 290 200, 290 200 C320 160, 360 160, 360 160 Z" },
  { id: "l_latissimus", name: "좌측 광배근 (L Latissimus Dorsi)",
    d: "M150 220 C140 250, 140 380, 160 500 C180 520, 220 540, 250 550 L250 350 C230 330, 220 300, 220 280 C210 250, 180 230, 150 220 Z" },
  { id: "r_latissimus", name: "우측 광배근 (R Latissimus Dorsi)",
    d: "M350 220 C360 250, 360 380, 340 500 C320 520, 280 540, 250 550 L250 350 C270 330, 280 300, 280 280 C290 250, 320 230, 350 220 Z" },
  { id: "l_infraspinatus", name: "좌측 극하근/대원근 (L Infraspinatus/Teres)",
    d: "M210 200 C215 230, 220 250, 220 280 C200 260, 160 240, 150 220 C170 210, 180 210, 210 200 Z" },
  { id: "r_infraspinatus", name: "우측 극하근/대원근 (R Infraspinatus/Teres)",
    d: "M290 200 C285 230, 280 250, 280 280 C300 260, 340 240, 350 220 C330 210, 320 210, 290 200 Z" },
  { id: "l_triceps", name: "좌측 삼두근 (L Triceps)",
    d: "M110 250 C100 300, 90 340, 95 360 C110 360, 120 350, 125 350 C135 300, 140 250, 150 220 C140 240, 130 260, 110 250 Z" },
  { id: "r_triceps", name: "우측 삼두근 (R Triceps)",
    d: "M390 250 C400 300, 410 340, 405 360 C390 360, 380 350, 375 350 C365 300, 360 250, 350 220 C360 240, 370 260, 390 250 Z" },
  { id: "l_oblique", name: "좌측 외복사근 (L External Oblique)",
    d: "M145 350 C130 400, 135 460, 140 510 C145 505, 155 505, 160 500 C140 380, 140 250, 150 220 Z" },
  { id: "r_oblique", name: "우측 외복사근 (R External Oblique)",
    d: "M355 350 C370 400, 365 460, 360 510 C355 505, 345 505, 340 500 C360 380, 360 250, 350 220 Z" },
  { id: "l_gluteus", name: "좌측 대둔근 (L Gluteus Maximus)",
    d: "M140 510 C130 550, 140 640, 170 660 C210 660, 230 640, 250 610 L250 550 C220 540, 180 520, 160 500 C155 505, 145 505, 140 510 Z" },
  { id: "r_gluteus", name: "우측 대둔근 (R Gluteus Maximus)",
    d: "M360 510 C370 550, 360 640, 330 660 C290 660, 270 640, 250 610 L250 550 C280 540, 320 520, 340 500 C345 505, 355 505, 360 510 Z" },
  { id: "fascia", name: "흉요근막 (Thoracolumbar Fascia)",
    d: "M250 350 C230 400, 210 480, 220 540 C230 570, 240 590, 250 610 C260 590, 270 570, 280 540 C290 480, 270 400, 250 350 Z" },
];

export default function InteractiveMuscleSVG() {
  const [activeAreas, setActiveAreas] = useState<string[]>([]);
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);

  const toggle = (id: string) => {
    setActiveAreas(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  return (
    <div className="flex flex-col items-center w-full bg-white rounded-2xl py-6 shadow-sm border border-gray-100 mt-6 max-w-xl mx-auto">
      <div className="mb-4 text-center">
        <h2 className="text-lg font-bold text-gray-800">근육계 후면 다이어그램</h2>
        <p className="text-sm text-gray-500 mt-1">부위를 클릭하여 선택/해제하세요.</p>
      </div>

      <div className="w-full max-w-[320px] aspect-[5/7] mx-auto relative rounded-xl bg-gradient-to-b from-gray-50 to-gray-100 p-4 ring-1 ring-black/5 align-middle shadow-inner">
        {hoveredArea && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap z-10 shadow-md">
            {POSTERIOR_MUSCLES.find(m => m.id === hoveredArea)?.name}
          </div>
        )}
        
        <svg viewBox="0 0 500 700" className="w-full h-full drop-shadow-xl" preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="sel-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="b" />
              <feComposite in="SourceGraphic" in2="b" operator="over" />
            </filter>
            
            <linearGradient id="muscleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
            
            <linearGradient id="fasciaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f3f4f6" />
              <stop offset="100%" stopColor="#e5e7eb" />
            </linearGradient>
          </defs>

          {POSTERIOR_MUSCLES.map(p => {
            const on = activeAreas.includes(p.id);
            const isHover = hoveredArea === p.id;
            const isFascia = p.id === 'fascia';
            
            let fill = isFascia ? "url(#fasciaGrad)" : "url(#muscleGrad)";
            if (on) fill = isFascia ? "#cbd5e1" : "#ef4444"; // Bright red when selected
            else if (isHover) fill = isFascia ? "#e2e8f0" : "#dc2626"; // Slightly brighter block when hovered
            
            return (
              <path
                key={p.id}
                d={p.d}
                fill={fill}
                stroke={isFascia ? "#9ca3af" : "#f87171"}
                strokeWidth={on ? 3 : 1.5}
                strokeLinejoin="round"
                filter={on && !isFascia ? "url(#sel-glow)" : undefined}
                className={`cursor-pointer transition-all duration-300 ease-out fill-available ${on ? "" : "opacity-90 active:scale-[0.98]"}`}
                style={{ 
                  transformBox: "fill-box", 
                  transformOrigin: "center", 
                  transform: on ? "scale(1.02)" : (isHover ? "scale(1.01)" : "scale(1)") 
                }}
                onClick={e => { e.preventDefault(); toggle(p.id); }}
                onMouseEnter={() => setHoveredArea(p.id)}
                onMouseLeave={() => setHoveredArea(null)}
                onTouchStart={() => setHoveredArea(p.id)}
                onTouchEnd={e => { e.preventDefault(); toggle(p.id); setHoveredArea(null); }}
                role="button"
                aria-label={p.name}
              />
            );
          })}
        </svg>
      </div>

      <div className="w-full mt-6 bg-white rounded-lg p-4 min-h-[4rem] px-6">
        <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-red-500" />
          선택된 근육 ({activeAreas.length})
        </div>
        <div className="flex flex-wrap gap-2">
          {activeAreas.length === 0
            ? <span className="text-sm text-gray-400 italic">클릭하여 근육을 선택하세요.</span>
            : activeAreas.map(id => {
                const p = POSTERIOR_MUSCLES.find(x => x.id === id);
                return p ? (
                  <span key={id} className="inline-flex items-center gap-1.5 bg-red-50 text-red-800 px-3 py-1.5 rounded-full text-xs font-bold border border-red-200 shadow-sm transition-all hover:bg-red-100 cursor-pointer" onClick={() => toggle(id)}>
                    {p.name}
                    <button type="button" className="ml-1 text-red-400 hover:text-red-600 focus:outline-none">&times;</button>
                  </span>
                ) : null;
              })
          }
        </div>
      </div>
    </div>
  );
}
