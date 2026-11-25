import type { DesignParameters } from '../../types';
import type {
  DrawingSheetSize,
  DrawingOrientation,
  ProjectionAngle,
  SheetDimensions,
} from './types';
import { getSheetDimensions, calculateOptimalDrawingScale } from './sheetStandards';

export interface ShaftGeometryModel {
  totalLength: number;
  mainDia: number;
  mainRadius: number;
  journalDia: number;
  journalRadius: number;
  journalLength: number;
  mainLength: number;
  chamferSize: number;
  filletRadius: number;
  gearDia: number;
  gearRadius: number;
  gearWidth: number;
  keywayWidth: number;
  keywayDepth: number;
  keywayLength: number;
  bearingOuterDia: number;
  bearingWidth: number;
}

export function computeShaftGeometryModel(params: DesignParameters): ShaftGeometryModel {
  const totalLength = Math.max(50, Number(params.length) || 320);
  const mainDia = Math.max(10, Number(params.diameter) || 45);
  const mainRadius = mainDia / 2;
  const journalDia = Math.round(mainDia * 0.9 * 100) / 100;
  const journalRadius = journalDia / 2;
  const journalLength = Math.round(Math.min(totalLength * 0.18, 50) * 100) / 100;
  const mainLength = Math.max(20, totalLength - 2 * journalLength);
  const chamferSize = 1.5;
  const filletRadius = Math.max(0.8, Math.round(mainDia * 0.05 * 10) / 10);
  const gearDia = Math.round(mainDia * 1.85 * 100) / 100;
  const gearRadius = gearDia / 2;
  const gearWidth = Math.round(Math.max(24, mainDia * 0.55) * 100) / 100;
  const keywayWidth = Math.max(2, Math.round(mainDia * 0.25 * 10) / 10);
  const keywayDepth = Math.max(1, Math.round(mainDia * 0.1 * 10) / 10);
  const keywayLength = Math.round(Math.max(20, Math.min(gearWidth * 1.6, mainLength * 0.6)) * 10) / 10;
  const bearingOuterDia = Math.round(journalDia * 1.85 * 100) / 100;
  const bearingWidth = Math.round(journalLength * 0.55 * 100) / 100;

  return {
    totalLength,
    mainDia,
    mainRadius,
    journalDia,
    journalRadius,
    journalLength,
    mainLength,
    chamferSize,
    filletRadius,
    gearDia,
    gearRadius,
    gearWidth,
    keywayWidth,
    keywayDepth,
    keywayLength,
    bearingOuterDia,
    bearingWidth,
  };
}

export interface ViewLayoutPosition {
  cx: number; // View center X in canvas units
  cy: number; // View center Y in canvas units
  originX: number; // Left edge of shaft in canvas units
  originY: number; // Centerline Y in canvas units
  scale: number; // Scale ratio (canvas units per mm)
}

export interface DrawingLayout {
  sheet: SheetDimensions;
  scaleLabel: string;
  scaleFactor: number;
  model: ShaftGeometryModel;
  frontView: ViewLayoutPosition;
  topView: ViewLayoutPosition;
  sideView: ViewLayoutPosition;
  isometricView: {
    cx: number;
    cy: number;
    scale: number;
  };
}

export function computeDrawingLayout(
  params: DesignParameters,
  sheetSize: DrawingSheetSize = 'A3',
  orientation: DrawingOrientation = 'landscape',
  projection: ProjectionAngle = 'first-angle'
): DrawingLayout {
  const sheet = getSheetDimensions(sheetSize, orientation);
  const model = computeShaftGeometryModel(params);
  const scaleLabel = calculateOptimalDrawingScale(model.totalLength, sheetSize);

  // Convert scale label (e.g. "1:1", "1:2", "2:1") to multiplier
  let scaleRatio = 1.0;
  if (scaleLabel === '2:1') scaleRatio = 2.0;
  else if (scaleLabel === '1:1') scaleRatio = 1.0;
  else if (scaleLabel === '1:2') scaleRatio = 0.5;
  else if (scaleLabel === '1:5') scaleRatio = 0.2;
  else if (scaleLabel === '1:10') scaleRatio = 0.1;

  // 1 mm on paper = 4.0 viewBox units * scaleRatio
  const scaleFactor = 4.0 * scaleRatio;

  // Margin buffer in viewBox units
  const margin = sheet.marginMm * 4.0;
  const usableW = sheet.viewBoxWidth - margin * 2;
  const usableH = sheet.viewBoxHeight - margin * 2;

  // Layout distribution
  // Front View sits in upper-middle
  const frontCx = margin + usableW * 0.40;
  const frontCy = margin + usableH * 0.38;
  const frontOriginX = frontCx - (model.totalLength / 2) * scaleFactor;
  const frontOriginY = frontCy;

  // Top View:
  // In First Angle projection: Top view is placed BELOW the Front view
  // In Third Angle projection: Top view is placed ABOVE the Front view
  const verticalOffset = Math.max(160, (model.gearDia + 50) * scaleFactor);
  const topCy = projection === 'first-angle' ? frontCy + verticalOffset : frontCy - verticalOffset;
  const topCx = frontCx;
  const topOriginX = frontOriginX;
  const topOriginY = topCy;

  // Side View (Section A-A):
  // Placed to the right of Front View
  const sideCx = Math.min(sheet.viewBoxWidth - margin - 220, frontCx + (model.totalLength / 2 + model.gearDia) * scaleFactor + 80);
  const sideCy = frontCy;
  const sideOriginX = sideCx;
  const sideOriginY = sideCy;

  // Isometric reference view:
  // Placed in upper right quadrant above the title block
  const isoCx = sheet.viewBoxWidth - margin - 180;
  const isoCy = margin + 140;
  const isoScale = Math.min(1.2, scaleFactor * 0.7);

  return {
    sheet,
    scaleLabel,
    scaleFactor,
    model,
    frontView: {
      cx: frontCx,
      cy: frontCy,
      originX: frontOriginX,
      originY: frontOriginY,
      scale: scaleFactor,
    },
    topView: {
      cx: topCx,
      cy: topCy,
      originX: topOriginX,
      originY: topOriginY,
      scale: scaleFactor,
    },
    sideView: {
      cx: sideCx,
      cy: sideCy,
      originX: sideOriginX,
      originY: sideOriginY,
      scale: scaleFactor,
    },
    isometricView: {
      cx: isoCx,
      cy: isoCy,
      scale: isoScale,
    },
  };
}
