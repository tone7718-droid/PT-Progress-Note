/**
 * PDF 페이지 분할 계산 (PT-Note-with-ChatGPT 의 getPdfPageSlices 이식).
 * 캔버스를 A4 페이지 높이 단위로 잘라, 페이지마다 해당 구간만 포함시킨다.
 * (기존 방식은 전체 이미지를 페이지마다 중복 포함 + 음수 오프셋 배치라
 * 파일 크기가 페이지 수에 비례해 커지는 문제가 있었음)
 */
export function getPdfPageSlices({
  canvasWidthPx,
  canvasHeightPx,
  pageWidthMm,
  pageHeightMm,
}: {
  canvasWidthPx: number;
  canvasHeightPx: number;
  pageWidthMm: number;
  pageHeightMm: number;
}): Array<{ sourceY: number; sourceHeight: number; pageImageHeightMm: number }> {
  if (canvasWidthPx <= 0 || canvasHeightPx <= 0) return [];

  const pageHeightPx = Math.max(1, Math.floor((pageHeightMm * canvasWidthPx) / pageWidthMm));
  const slices: Array<{ sourceY: number; sourceHeight: number; pageImageHeightMm: number }> = [];

  for (let sourceY = 0; sourceY < canvasHeightPx; sourceY += pageHeightPx) {
    const sourceHeight = Math.min(pageHeightPx, canvasHeightPx - sourceY);
    const isFullPage = sourceHeight === pageHeightPx;
    slices.push({
      sourceY,
      sourceHeight,
      pageImageHeightMm: isFullPage
        ? pageHeightMm
        : Number(((sourceHeight * pageWidthMm) / canvasWidthPx).toFixed(2)),
    });
  }

  return slices;
}
