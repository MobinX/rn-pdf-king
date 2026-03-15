import React from 'react';
import { requireNativeViewManager } from 'expo-modules-core';
import { ViewProps, NativeSyntheticEvent } from 'react-native';

const NativePdfView = requireNativeViewManager('RnPdfKing');

export interface PdfPageProps extends ViewProps {
  pageNo: number;
  width?: number;
  height?: number;
  onSelectionChanged?: (event: NativeSyntheticEvent<{ selectedText: string }>) => void;
  onSelectionStarted?: (event: NativeSyntheticEvent<{}>) => void;
  onSelectionEnded?: (event: NativeSyntheticEvent<{}>) => void;
}

export const PdfPage: React.FC<PdfPageProps> = (props) => {
  const { width, height, onSelectionChanged, onSelectionStarted, onSelectionEnded, ...rest } = props;
  
  return (
    <NativePdfView 
      pdfWidth={width} 
      pdfHeight={height} 
      onSelectionChanged={onSelectionChanged}
      onSelectionStarted={onSelectionStarted}
      onSelectionEnded={onSelectionEnded}
      {...rest} 
    />
  );
};
