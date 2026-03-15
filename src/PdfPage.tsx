import React from 'react';
import { requireNativeViewManager } from 'expo-modules-core';
import { ViewProps, NativeSyntheticEvent, processColor } from 'react-native';
import { Highlight } from './RnPdfKing.types';

const NativePdfView = requireNativeViewManager('RnPdfKing');

export interface PdfPageProps extends ViewProps {
  pageNo: number;
  width?: number;
  height?: number;
  preDefinedHighlights?: Highlight[];
  handleColor?: string | number;
  selectionColor?: string | number;
  onSelectionChanged?: (event: NativeSyntheticEvent<{ selectedText: string }>) => void;
  onSelectionStarted?: (event: NativeSyntheticEvent<{}>) => void;
  onSelectionEnded?: (event: NativeSyntheticEvent<{}>) => void;
  onPreDefinedHighlightClick?: (event: NativeSyntheticEvent<{ id: string }>) => void;
}

export const PdfPage: React.FC<PdfPageProps> = (props) => {
  const { 
    width, 
    height, 
    preDefinedHighlights,
    handleColor,
    selectionColor,
    onSelectionChanged, 
    onSelectionStarted, 
    onSelectionEnded,
    onPreDefinedHighlightClick,
    ...rest 
  } = props;
  
  const processedHighlights = preDefinedHighlights?.map(h => ({
    ...h,
    color: processColor(h.color)
  }));
  
  return (
    <NativePdfView 
      pdfWidth={width} 
      pdfHeight={height} 
      preDefinedHighlights={processedHighlights}
      handleColor={processColor(handleColor)}
      selectionColor={processColor(selectionColor)}
      onSelectionChanged={onSelectionChanged}
      onSelectionStarted={onSelectionStarted}
      onSelectionEnded={onSelectionEnded}
      onPreDefinedHighlightClick={onPreDefinedHighlightClick}
      {...rest} 
    />
  );
};
