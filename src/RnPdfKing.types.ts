import type { StyleProp, ViewStyle } from 'react-native';

export type OnLoadEventPayload = {
  url: string;
};

export type RnPdfKingModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
  onPdfLoadSuccess: (event: { filePath: string; fileName: string; pageCount: number }) => void;
  onPdfLoadError: (event: { message: string }) => void;
};

export type ChangeEventPayload = {
  value: string;
};

export type RnPdfKingViewProps = {
  pageNo: number;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  onSelectionChanged?: (event: { nativeEvent: { selectedText: string } }) => void;
};
