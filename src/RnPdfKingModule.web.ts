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
}

export default registerWebModule(RnPdfKingModule, 'RnPdfKingModule');
