import React, { forwardRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { PdfPage, PdfPageProps, PdfPageHandle } from './PdfPage';
import { ZoomablePage } from './ZoomablePage';
import { useZoomableList } from './ZoomableList';

export interface ZoomablePdfPageProps extends PdfPageProps {
  width?: number;
  height: number;
  style?: StyleProp<ViewStyle>;
}

export const ZoomablePdfPage = forwardRef<PdfPageHandle, ZoomablePdfPageProps>((props, ref) => {
  const { width: propWidth, height, style, selectionEnabled, ...pdfProps } = props;
  const { isPanning, isPinching, width: contextWidth } = useZoomableList();

  const width = propWidth ?? contextWidth;
  const isInteracting = isPanning || isPinching;
  const shouldEnableSelection = selectionEnabled !== undefined 
    ? (selectionEnabled && !isInteracting) 
    : !isInteracting;

  return (
    <ZoomablePage width={width} height={height} style={style}>
      <PdfPage
        ref={ref}
        width={width}
        height={height}
        style={{ width, height }}
        selectionEnabled={shouldEnableSelection}
        {...pdfProps}
      />
    </ZoomablePage>
  );
});
