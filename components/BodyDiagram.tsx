"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { CheckCircle2, X } from "lucide-react";
import type { PainEntry, PainLevel, PainView } from "@/types";

const PAIN_LABEL = {
  1: "Mild",
  2: "Moderate",
  3: "Severe",
};

const SEVERITY_COLOR = {
  1: { fill: "#fde047", stroke: "#ca8a04", tw: "bg-yellow-300 border-yellow-600" },
  2: { fill: "#f97316", stroke: "#c2410c", tw: "bg-orange-500 border-orange-700" },
  3: { fill: "#ef4444", stroke: "#991b1b", tw: "bg-red-500 border-red-800" },
};

const LENS_PX = 192;
const LENS_HALF = LENS_PX / 2;
const LENS_ZOOM = 1.5;
const LENS_OFFSET_Y = -130;
const LONG_PRESS_MS = 400;
const DRAG_THRESHOLD = 10;

function entriesToMap(entries: PainEntry[]) {
  const m = new Map<string, PainLevel>();
  for (const e of entries) m.set(`${e.view}::${e.region}`, e.painLevel);
  return m;
}

interface BodyDiagramProps {
  value?: PainEntry[];
  onChange?: (entries: PainEntry[]) => void;
}

export default function BodyDiagram({ value, onChange }: BodyDiagramProps) {
  const [internal, setInternal] = useState<PainEntry[]>([]);
  const ctrl = value !== undefined && onChange !== undefined;
  const entries = ctrl ? value : internal;
  const setEntries = ctrl ? onChange : setInternal;

  const painMap = useMemo(() => entriesToMap(entries), [entries]);

  const magnifyRef = useRef<PainEntry[] | null>(null);

  useEffect(() => {
    magnifyRef.current = entries;
  }, [entries]);

  return <div>{/* Component JSX */}</div>;
}