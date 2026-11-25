import type { DrawingLayout } from './drawingGeometry';
import type { DrawingTitleBlock, ManufacturingSpec, DesignVerificationReport } from './types';

/**
 * Downloads a text or blob file in the browser
 */
function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports the active SVG element as a standalone, self-contained SVG file
 */
export function exportSvgDrawing(svgElement: SVGSVGElement, filename: string = 'engineering-drawing.svg'): void {
  // Clone the SVG node to ensure clean export
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(clone);

  // Prepend standard XML declaration and DOCTYPE
  svgString = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n${svgString}`;

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  triggerBrowserDownload(blob, filename);
}

/**
 * Exports high-resolution raster PNG from an SVG element using an offscreen canvas
 */
export function exportPngDrawing(
  svgElement: SVGSVGElement,
  filename: string = 'engineering-drawing.png',
  dpiMultiplier: number = 2.0
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const bbox = svgElement.viewBox.baseVal;
      const width = (bbox.width || 1680) * (dpiMultiplier / 2);
      const height = (bbox.height || 1188) * (dpiMultiplier / 2);

      const clone = svgElement.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const svgString = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas 2D context not available'));
          return;
        }

        // Fill background white
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);

        canvas.toBlob((blob) => {
          if (blob) {
            triggerBrowserDownload(blob, filename);
            resolve();
          } else {
            reject(new Error('Failed to create PNG blob'));
          }
        }, 'image/png');
      };

      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };

      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Triggers browser print dialog formatted specifically for CAD drawing sheets
 */
export function printDrawingSheet(): void {
  window.print();
}

/**
 * Exports complete manufacturing specification and verification audit as JSON
 */
export function exportManufacturingReportJson(
  spec: ManufacturingSpec,
  verification: DesignVerificationReport,
  titleBlock: DrawingTitleBlock,
  filename: string = 'manufacturing-verification-audit.json'
): void {
  const auditData = {
    exportDate: new Date().toISOString(),
    titleBlock,
    manufacturingSpecification: spec,
    designVerificationReport: verification,
    disclaimer: verification.disclaimer,
  };

  const jsonStr = JSON.stringify(auditData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  triggerBrowserDownload(blob, filename);
}
