// Reexport the native module. On web, it will be resolved to RnPdfKingModule.web.ts
// and on native platforms to RnPdfKingModule.ts
export { default } from './RnPdfKingModule';
export { default as RnPdfKingView } from './RnPdfKingView';
export * from  './RnPdfKing.types';
