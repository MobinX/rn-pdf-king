import { NativeModule, requireNativeModule } from 'expo';

import { RnPdfKingModuleEvents } from './RnPdfKing.types';

declare class RnPdfKingModule extends NativeModule<RnPdfKingModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
  pickFile(): Promise<void>;
  loadPdf(path: string): Promise<void>;
  checkInitialIntent(): Promise<boolean>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<RnPdfKingModule>('RnPdfKing');
