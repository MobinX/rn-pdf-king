import React from 'react';
import { StyleProp, ViewStyle, NativeSyntheticEvent } from 'react-native';
import { PdfPage, PdfPageProps } from './PdfPage';
import { ZoomablePage } from './ZoomablePage';

export interface ZoomablePdfPageProps extends PdfPageProps {
  width: number;
  height: number;
  style?: StyleProp<ViewStyle>;
}

export const ZoomablePdfPage: React.FC<ZoomablePdfPageProps> = (props) => {
  const { width, height, style, ...pdfProps } = props;

  return (
    <ZoomablePage width={width} height={height} style={style}>
      <PdfPage
        width={width}
        height={height}
        style={{ width, height }}
        {...pdfProps}
      />
    </ZoomablePage>
  );
};
