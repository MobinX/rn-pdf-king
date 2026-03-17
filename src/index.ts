// Reexport the native module. On web, it will be resolved to RnPdfKingModule.web.ts
// and on native platforms to RnPdfKingModule.ts
export { default } from './RnPdfKingModule';
export * from  './RnPdfKing.types';
export * from './PdfDocument';
export * from './PdfPage';
export * from './ZoomableList';
export * from './ZoomablePage';
export * from './ZoomablePdfPage';
