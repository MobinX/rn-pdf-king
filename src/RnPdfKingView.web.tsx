import * as React from 'react';

import { RnPdfKingViewProps } from './RnPdfKing.types';

export default function RnPdfKingView(props: RnPdfKingViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad?.({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
