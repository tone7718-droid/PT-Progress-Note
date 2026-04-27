import * as React from "react";
import { useFormContext, Controller } from "react-hook-form";
import type { NoteData } from "@/types";
import { Card } from "@/components/ui/Card";
import BodyDiagram from "@/components/BodyDiagram";

/* ── 통증 부위 ID -> 한글 이름 매핑 (인쇄/PDF용) ── */
const PAIN_AREA_NAMES: Record<string, string> = {
  head_a: "머리 (앞)", neck_a: "목 (앞)", r_delt_a: "우측 삼각근", l_delt_a: "좌측 삼각근", r_pec_a: "우측 대흉근", l_pec_a: "좌측 대흉근", abs_a: "복근", r_bicep_a: "우측 이두근", l_bicep_a: "좌측 이두근", r_forearm_a: "우측 전완", l_forearm_a: "좌측 전완", r_hand_a: "우측 손", l_hand_a: "좌측 손", r_groin_a: "우측 서혜부", l_groin_a: "좌측 서혜부", r_quad_a: "우측 대퇴사두근", l_quad_a: "좌측 대퇴사두근", r_knee_a: "우측 슬관절", l_knee_a: "좌측 슬관절", r_tib_a: "우측 전경골근", l_tib_a: "좌측 전경골근", r_foot_a: "우측 발",
  head_p: "뒤통수", neck_p: "경추", l_delt_p: "좌측 후면 삼각근", r_delt_p: "우측 후면 삼각근", l_trap: "좌측 승모근", r_trap: "우측 승모근", lback_p: "요추", l_tri_p: "좌측 삼두근", r_tri_p: "우측 삼두근", l_fa_p: "좌측 후면 전완", r_fa_p: "우측 후면 전완", l_hand_p: "좌측 손등", r_hand_p: "우측 손등", l_glute_p: "좌측 둔근", r_glute_p: "우측 둔근", l_ham_p: "좌측 햄스트링", r_ham_p: "우측 햄스트링", l_pop_p: "좌측 오금", r_pop_p: "우측 오금", l_calf_p: "좌측 비복근", r_calf_p: "우측 비복근", l_sole_p: "좌측 발바닥", r_sole_p: "우측 발바닥"
};

export function BodyDiagramSection({ isGeneratingPdf }: { isGeneratingPdf: boolean }) {
  const { control, watch } = useFormContext<NoteData>();
  const painAreas = watch("painAreas") || [];

  const sectionTitleCls = isGeneratingPdf
    ? "text-lg font-bold text-black border-b-2 border-gray-400 pb-1 mb-2 mt-4"
    : "text-2xl font-bold text-gray-900 border-b-2 border-gray-100 pb-3 mb-6 print:text-xl print:mb-3 print:pb-2 print:-mt-2";

  return (
    <Card isPdfMode={isGeneratingPdf}>
      <h2 className={sectionTitleCls}>3. 인체 통증 부위 (Pain Areas)</h2>
      <div className={`${isGeneratingPdf ? 'hidden' : 'print:hidden flex justify-center w-full'}`}>
        <Controller
          name="painAreas"
          control={control}
          render={({ field }) => (
            <BodyDiagram painAreas={field.value || []} setPainAreas={field.onChange} />
          )}
        />
      </div>
      {/* PDF 및 인쇄 모드에선 텍스트 표출 */}
      <div className={`${isGeneratingPdf ? 'block' : 'hidden print:block mt-2'}`}>
        {painAreas.length > 0 ? (
          <div className={`${isGeneratingPdf ? 'py-2 font-medium text-black' : 'p-3 border-2 border-gray-300 rounded-xl bg-gray-50 font-bold text-gray-800 text-base'}`}>
            {painAreas.map((id) => PAIN_AREA_NAMES[id] || id).join(", ")}
          </div>
        ) : (
          <div className={`${isGeneratingPdf ? 'py-2 text-gray-500' : 'p-3 text-gray-500 italic text-sm'}`}>선택된 부위가 없습니다.</div>
        )}
      </div>
    </Card>
  );
}
