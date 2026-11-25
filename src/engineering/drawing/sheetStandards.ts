import type { DrawingSheetSize, DrawingOrientation, SheetDimensions, ProjectionAngle } from './types';

export const SHEET_SPECS: Record<DrawingSheetSize, { widthMm: number; heightMm: number }> = {
  A4: { widthMm: 297, heightMm: 210 }, // Landscape baseline
  A3: { widthMm: 420, heightMm: 297 },
  A2: { widthMm: 594, heightMm: 420 },
};

export function getSheetDimensions(
  size: DrawingSheetSize = 'A3',
  orientation: DrawingOrientation = 'landscape'
): SheetDimensions {
  const spec = SHEET_SPECS[size];
  const isLandscape = orientation === 'landscape';

  const widthMm = isLandscape ? Math.max(spec.widthMm, spec.heightMm) : Math.min(spec.widthMm, spec.heightMm);
  const heightMm = isLandscape ? Math.min(spec.widthMm, spec.heightMm) : Math.max(spec.widthMm, spec.heightMm);

  // High-precision vector viewBox scaling: 1 mm = 4.0 viewBox units
  const unitsPerMm = 4.0;
  const viewBoxWidth = widthMm * unitsPerMm;
  const viewBoxHeight = heightMm * unitsPerMm;
  const marginMm = 10;

  return {
    widthMm,
    heightMm,
    viewBoxWidth,
    viewBoxHeight,
    marginMm,
  };
}

/**
 * Calculates optimal technical drawing scale (1:1, 1:2, 1:5, etc.) to fit shaft within sheet bounds
 */
export function calculateOptimalDrawingScale(shaftLengthMm: number, sheetSize: DrawingSheetSize = 'A3'): string {
  const spec = SHEET_SPECS[sheetSize];
  const usableWidthMm = spec.widthMm * 0.65; // 65% for orthographic views

  if (shaftLengthMm <= usableWidthMm * 0.45) return '2:1';
  if (shaftLengthMm <= usableWidthMm) return '1:1';
  if (shaftLengthMm <= usableWidthMm * 2) return '1:2';
  if (shaftLengthMm <= usableWidthMm * 5) return '1:5';
  return '1:10';
}

/**
 * Generates ISO 10209 standard first-angle or third-angle projection cone symbol SVG elements
 */
export function getProjectionSymbolSvg(projection: ProjectionAngle, x: number, y: number): string {
  // ISO cone: frustum of cone + two concentric circles
  if (projection === 'first-angle') {
    // First Angle: Cone frustum on LEFT, concentric circles on RIGHT
    return `
      <g transform="translate(${x}, ${y})" stroke="currentColor" fill="none" stroke-width="1.2">
        <!-- Centerlines -->
        <line x1="-30" y1="0" x2="35" y2="0" stroke-dasharray="6,2,1,2" stroke-width="0.8" />
        <line x1="20" y1="-14" x2="20" y2="14" stroke-dasharray="6,2,1,2" stroke-width="0.8" />
        <!-- Frustum of Cone -->
        <polygon points="-25,-10 -5,-5 -5,5 -25,10" />
        <!-- End Circles -->
        <circle cx="20" cy="0" r="5" />
        <circle cx="20" cy="0" r="10" />
      </g>
    `;
  } else {
    // Third Angle: Concentric circles on LEFT, cone frustum on RIGHT
    return `
      <g transform="translate(${x}, ${y})" stroke="currentColor" fill="none" stroke-width="1.2">
        <!-- Centerlines -->
        <line x1="-35" y1="0" x2="30" y2="0" stroke-dasharray="6,2,1,2" stroke-width="0.8" />
        <line x1="-20" y1="-14" x2="-20" y2="14" stroke-dasharray="6,2,1,2" stroke-width="0.8" />
        <!-- End Circles -->
        <circle cx="-20" cy="0" r="5" />
        <circle cx="-20" cy="0" r="10" />
        <!-- Frustum of Cone -->
        <polygon points="5,-5 25,-10 25,10 5,5" />
      </g>
    `;
  }
}
