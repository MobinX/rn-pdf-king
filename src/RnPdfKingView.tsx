import { requireNativeView } from 'expo';
import * as React from 'react';

import { RnPdfKingViewProps } from './RnPdfKing.types';

const NativeView: React.ComponentType<RnPdfKingViewProps> =
  requireNativeView('RnPdfKing');

export default function RnPdfKingView(props: RnPdfKingViewProps) {
  return <NativeView {...props} />;
}
