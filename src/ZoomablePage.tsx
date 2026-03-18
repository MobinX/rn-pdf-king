import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';

export interface ZoomablePageProps {
  children: React.ReactNode;
  width: number;
  height: number;
  style?: StyleProp<ViewStyle>;
}

export const ZoomablePage: React.FC<ZoomablePageProps> = ({
  children,
  width,
  height,
  style,
}) => {
  return (
    <View
      style={[
        {
          width,
          height,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};
