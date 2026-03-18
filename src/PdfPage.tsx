import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { requireNativeViewManager } from 'expo-modules-core';
import { ViewProps, NativeSyntheticEvent, processColor } from 'react-native';
import { Highlight } from './RnPdfKing.types';

const NativePdfView = requireNativeViewManager('RnPdfKing');

export interface PdfPageProps extends ViewProps {
  pageNo: number;
  width?: number;
  height?: number;
  preDefinedHighlights?: Highlight[];
  preDefinedDottedHighlights?: Highlight[];
  handleColor?: string | number;
  selectionColor?: string | number;
  selectionEnabled?: boolean;
  onSelectionChanged?: (event: NativeSyntheticEvent<{ selectedText: string; selectionStart: number; selectionEnd: number }>) => void;
  onSelectionStarted?: (event: NativeSyntheticEvent<{}>) => void;
  onSelectionEnded?: (event: NativeSyntheticEvent<{}>) => void;
  onPreDefinedHighlightClick?: (event: NativeSyntheticEvent<{ id: string }>) => void;
}

export interface PdfPageHandle {
  clearSelectionState: () => void;
}

export const PdfPage = forwardRef<PdfPageHandle, PdfPageProps>((props, ref) => {
  const { 
    width, 
    height, 
    preDefinedHighlights,
    preDefinedDottedHighlights,
    handleColor,
    selectionColor,
    selectionEnabled,
    onSelectionChanged, 
    onSelectionStarted, 
    onSelectionEnded,
    onPreDefinedHighlightClick,
    ...rest 
  } = props;
  
  const nativeRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    clearSelectionState: () => {
      nativeRef.current?.clearSelection?.();
    }
  }));
  
  const processedHighlights = preDefinedHighlights?.map(h => ({
    ...h,
    color: processColor(h.color)
  }));

  const processedDottedHighlights = preDefinedDottedHighlights?.map(h => ({
    ...h,
    color: processColor(h.color)
  }));
  
  return (
    <NativePdfView 
      ref={nativeRef}
      pdfWidth={width} 
      pdfHeight={height} 
      preDefinedHighlights={processedHighlights}
      preDefinedDottedHighlights={processedDottedHighlights}
      handleColor={processColor(handleColor)}
      selectionColor={processColor(selectionColor)}
      selectionEnabled={selectionEnabled}
      onSelectionChanged={onSelectionChanged}
      onSelectionStarted={onSelectionStarted}
      onSelectionEnded={onSelectionEnded}
      onPreDefinedHighlightClick={onPreDefinedHighlightClick}
      {...rest} 
    />
  );
});
