import type { StyleProp, ViewStyle, NativeSyntheticEvent, ColorValue } from 'react-native';

export type Highlight = {
  id: string;
  startIndex: number;
  endIndex: number;
  color: ColorValue | number;
};

export type RnPdfKingModuleEvents = {
  onPdfLoadStarted: () => void;
  onPdfLoadSuccess: (event: { filePath: string; fileName: string; pageCount: number }) => void;
  onPdfLoadError: (event: { message: string }) => void;
};

export type RnPdfKingViewProps = {
  pageNo: number;
  pdfWidth?: number;
  pdfHeight?: number;
  preDefinedHighlights?: Highlight[];
  handleColor?: ColorValue | number;
  selectionColor?: ColorValue | number;
  selectionEnabled?: boolean;
  style?: StyleProp<ViewStyle>;
  onSelectionChanged?: (event: NativeSyntheticEvent<{ selectedText: string }>) => void;
  onSelectionStarted?: (event: NativeSyntheticEvent<{}>) => void;
  onSelectionEnded?: (event: NativeSyntheticEvent<{}>) => void;
  onPreDefinedHighlightClick?: (event: NativeSyntheticEvent<{ id: string }>) => void;
};
