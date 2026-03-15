import React from 'react';
import { requireNativeViewManager } from 'expo-modules-core';
import { ViewProps, NativeSyntheticEvent } from 'react-native';

const NativePdfView = requireNativeViewManager('RnPdfKing');

export interface PdfPageProps extends ViewProps {
  pageNo: number;
  width?: number;
  height?: number;
  onSelectionChanged?: (event: NativeSyntheticEvent<{ selectedText: string }>) => void;
}

export const PdfPage: React.FC<PdfPageProps> = (props) => {
  const { width, height, ...rest } = props;
  // @ts-ignore: Native props mismatch with ViewProps
  return <NativePdfView pdfWidth={width} pdfHeight={height} {...rest} />;
};
