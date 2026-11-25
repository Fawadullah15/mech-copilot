import type { DesignParameters } from '../../types';
import type { DrawingDimension } from './types';
import type { DrawingLayout } from './drawingGeometry';

/**
 * Generates ISO 129-1 compliant technical dimensions linked dynamically to model geometry.
 */
export function generateDrawingDimensions(
  layout: DrawingLayout,
  params: DesignParameters
): DrawingDimension[] {
  const { model, frontView, sideView, topView } = layout;
  const s = frontView.scale;
  const dims: DrawingDimension[] = [];

  const mainRadiusPx = model.mainRadius * s;
  const journalRadiusPx = model.journalRadius * s;
  const journalLenPx = model.journalLength * s;
  const totalLenPx = model.totalLength * s;
  const gearRadiusPx = model.gearRadius * s;
  const gearWidthPx = model.gearWidth * s;

  const leftEdgeX = frontView.originX;
  const rightEdgeX = frontView.originX + totalLenPx;
  const centerY = frontView.originY;

  // 1. Overall Shaft Length (Front View - Top Dimension)
  const totalLengthElevY = centerY - gearRadiusPx - 45;
  dims.push({
    id: 'dim-total-length',
    parameterKey: 'length',
    label: 'Overall Shaft Length',
    nominalValue: model.totalLength,
    unit: 'mm',
    dimensionType: 'linear-length',
    editable: true,
    view: 'front',
    x1: leftEdgeX,
    y1: totalLengthElevY,
    x2: rightEdgeX,
    y2: totalLengthElevY,
    textX: (leftEdgeX + rightEdgeX) / 2,
    textY: totalLengthElevY - 8,
    orientation: 'horizontal',
    witnessStart1: { x: leftEdgeX, y: centerY - journalRadiusPx },
    witnessStart2: { x: rightEdgeX, y: centerY - journalRadiusPx },
  });

  // 2. Main Body Shaft Diameter (Front View - Center)
  const mainDiaX = frontView.originX + journalLenPx + 35;
  const mainDiaTopY = centerY - mainRadiusPx;
  const mainDiaBotY = centerY + mainRadiusPx;
  dims.push({
    id: 'dim-main-dia',
    parameterKey: 'diameter',
    label: 'Shaft Body Diameter',
    nominalValue: model.mainDia,
    unit: 'mm',
    dimensionType: 'diameter',
    editable: true,
    view: 'front',
    x1: mainDiaX,
    y1: mainDiaTopY,
    x2: mainDiaX,
    y2: mainDiaBotY,
    textX: mainDiaX + 18,
    textY: centerY,
    orientation: 'vertical',
    witnessStart1: { x: mainDiaX - 5, y: mainDiaTopY },
    witnessStart2: { x: mainDiaX - 5, y: mainDiaBotY },
  });

  // 3. Left Bearing Seat Journal Diameter (k5 fit ISO 286-2)
  const leftJournalX = leftEdgeX + journalLenPx * 0.45;
  const leftJournalTopY = centerY - journalRadiusPx;
  const leftJournalBotY = centerY + journalRadiusPx;
  dims.push({
    id: 'dim-left-journal-dia',
    label: 'Left Journal Diameter (Locating Support)',
    nominalValue: model.journalDia,
    unit: 'mm',
    dimensionType: 'diameter',
    fitTolerance: 'k5',
    upperDevMm: 0.011,
    lowerDevMm: 0.002,
    editable: false,
    view: 'front',
    x1: leftJournalX,
    y1: leftJournalTopY,
    x2: leftJournalX,
    y2: leftJournalBotY,
    textX: leftJournalX - 25,
    textY: centerY,
    orientation: 'vertical',
  });

  // 4. Right Bearing Seat Journal Diameter (k5 fit ISO 286-2)
  const rightJournalX = rightEdgeX - journalLenPx * 0.45;
  const rightJournalTopY = centerY - journalRadiusPx;
  const rightJournalBotY = centerY + journalRadiusPx;
  dims.push({
    id: 'dim-right-journal-dia',
    label: 'Right Journal Diameter (Floating Support)',
    nominalValue: model.journalDia,
    unit: 'mm',
    dimensionType: 'diameter',
    fitTolerance: 'k5',
    upperDevMm: 0.011,
    lowerDevMm: 0.002,
    editable: false,
    view: 'front',
    x1: rightJournalX,
    y1: rightJournalTopY,
    x2: rightJournalX,
    y2: rightJournalBotY,
    textX: rightJournalX + 22,
    textY: centerY,
    orientation: 'vertical',
  });

  // 5. Left Journal Length
  const leftJournalDimY = centerY + mainRadiusPx + 30;
  dims.push({
    id: 'dim-left-journal-len',
    label: 'Left Journal Length',
    nominalValue: model.journalLength,
    unit: 'mm',
    dimensionType: 'linear-length',
    editable: false,
    view: 'front',
    x1: leftEdgeX,
    y1: leftJournalDimY,
    x2: leftEdgeX + journalLenPx,
    y2: leftJournalDimY,
    textX: leftEdgeX + journalLenPx / 2,
    textY: leftJournalDimY + 16,
    orientation: 'horizontal',
    witnessStart1: { x: leftEdgeX, y: centerY + journalRadiusPx },
    witnessStart2: { x: leftEdgeX + journalLenPx, y: centerY + mainRadiusPx },
  });

  // 6. Right Journal Length
  dims.push({
    id: 'dim-right-journal-len',
    label: 'Right Journal Length',
    nominalValue: model.journalLength,
    unit: 'mm',
    dimensionType: 'linear-length',
    editable: false,
    view: 'front',
    x1: rightEdgeX - journalLenPx,
    y1: leftJournalDimY,
    x2: rightEdgeX,
    y2: leftJournalDimY,
    textX: rightEdgeX - journalLenPx / 2,
    textY: leftJournalDimY + 16,
    orientation: 'horizontal',
    witnessStart1: { x: rightEdgeX - journalLenPx, y: centerY + mainRadiusPx },
    witnessStart2: { x: rightEdgeX, y: centerY + journalRadiusPx },
  });

  // 7. Gear Hub Face Width
  const gearLeftX = frontView.cx - gearWidthPx / 2;
  const gearRightX = frontView.cx + gearWidthPx / 2;
  const gearDimY = centerY - gearRadiusPx - 20;
  dims.push({
    id: 'dim-gear-width',
    label: 'Gear Hub Face Width',
    nominalValue: model.gearWidth,
    unit: 'mm',
    dimensionType: 'linear-length',
    editable: false,
    view: 'front',
    x1: gearLeftX,
    y1: gearDimY,
    x2: gearRightX,
    y2: gearDimY,
    textX: frontView.cx,
    textY: gearDimY - 8,
    orientation: 'horizontal',
    witnessStart1: { x: gearLeftX, y: centerY - gearRadiusPx },
    witnessStart2: { x: gearRightX, y: centerY - gearRadiusPx },
  });

  // 8. Gear Tip Diameter (Side View / Section A-A)
  dims.push({
    id: 'dim-gear-dia',
    label: 'Spur Gear Tip Diameter (da)',
    nominalValue: model.gearDia,
    unit: 'mm',
    dimensionType: 'diameter',
    editable: false,
    view: 'side',
    x1: sideView.cx - gearRadiusPx,
    y1: sideView.cy - gearRadiusPx - 20,
    x2: sideView.cx + gearRadiusPx,
    y2: sideView.cy - gearRadiusPx - 20,
    textX: sideView.cx,
    textY: sideView.cy - gearRadiusPx - 28,
    orientation: 'horizontal',
  });

  // 9. Keyway Width & Depth (Side View / Section A-A)
  const kwWidthPx = model.keywayWidth * s;
  const kwDepthPx = model.keywayDepth * s;
  const kwTopY = sideView.cy - mainRadiusPx;
  dims.push({
    id: 'dim-keyway-width',
    label: 'Keyway Width (DIN 6885-1 P9)',
    nominalValue: model.keywayWidth,
    unit: 'mm',
    fitTolerance: 'P9',
    upperDevMm: -0.012,
    lowerDevMm: -0.042,
    dimensionType: 'linear-length',
    editable: false,
    view: 'side',
    x1: sideView.cx - kwWidthPx / 2,
    y1: kwTopY - 14,
    x2: sideView.cx + kwWidthPx / 2,
    y2: kwTopY - 14,
    textX: sideView.cx,
    textY: kwTopY - 20,
    orientation: 'horizontal',
  });

  // 10. Fillet Radius
  dims.push({
    id: 'dim-fillet-radius',
    label: 'Shoulder Transition Fillet Radius',
    nominalValue: model.filletRadius,
    unit: 'mm',
    dimensionType: 'radius',
    editable: false,
    view: 'front',
    x1: leftEdgeX + journalLenPx,
    y1: centerY - mainRadiusPx + 4,
    x2: leftEdgeX + journalLenPx + 15,
    y2: centerY - mainRadiusPx - 10,
    textX: leftEdgeX + journalLenPx + 22,
    textY: centerY - mainRadiusPx - 14,
    orientation: 'radial',
  });

  // 11. Chamfers
  dims.push({
    id: 'dim-chamfer',
    label: 'Shaft End Chamfer',
    nominalValue: model.chamferSize,
    unit: 'mm',
    dimensionType: 'chamfer',
    editable: false,
    view: 'front',
    x1: leftEdgeX,
    y1: centerY - journalRadiusPx,
    x2: leftEdgeX - 15,
    y2: centerY - journalRadiusPx - 15,
    textX: leftEdgeX - 25,
    textY: centerY - journalRadiusPx - 20,
    orientation: 'radial',
  });

  return dims;
}
