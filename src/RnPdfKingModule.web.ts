import { registerWebModule, NativeModule } from 'expo';

import { RnPdfKingModuleEvents } from './RnPdfKing.types';

class RnPdfKingModule extends NativeModule<RnPdfKingModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
  async pickFile(): Promise<void> {
    console.warn('pickFile is not implemented on web');
  }
  async loadPdf(path: string): Promise<void> {
    console.warn('loadPdf is not implemented on web');
  }
  async checkInitialIntent(): Promise<boolean> {
    return false;
  }
}

export default registerWebModule(RnPdfKingModule, 'RnPdfKingModule');
