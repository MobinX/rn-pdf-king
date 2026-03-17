import React, { useState } from 'react';
import {
  StyleProp,
  ViewStyle,
  View,
  LayoutChangeEvent,
  StyleSheet,
} from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { useZoomGesture, UseZoomGestureProps } from './zoom/index';
import { FlashList, FlashListProps, ListRenderItemInfo } from '@shopify/flash-list';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

export interface ZoomableListProps<T> extends Omit<FlashListProps<T>, 'renderItem'> {
  renderItem: (info: ListRenderItemInfo<T> & { width: number }) => React.ReactElement | null;
  style?: StyleProp<ViewStyle>;
  zoomProps?: Omit<UseZoomGestureProps, 'parentAnimatedScrollRef'>;
  onZoomChange?: (scale: number) => void;
  onZoomStateChange?: (isZoomed: boolean) => void;
}

export function ZoomableList<T>(props: ZoomableListProps<T>) {
  const {
    style,
    zoomProps,
    onZoomChange,
    onZoomStateChange,
    renderItem,
    ...flashListProps
  } = props;

  const [width, setWidth] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  // @ts-ignore
  const listRef = useAnimatedRef<FlashList<T>>();

  const {
    zoomGesture,
    contentContainerAnimatedStyle,
    onLayout,
    onLayoutContent,
    onScroll,
  } = useZoomGesture({
    disableVerticalPan: true,
    parentAnimatedScrollRef: listRef,
    onZoomChange: (s) => {
      const newIsZoomed = s > 1.05; // Small buffer
      if (newIsZoomed !== isZoomed) {
        setIsZoomed(newIsZoomed);
        onZoomStateChange?.(newIsZoomed);
      }
      onZoomChange?.(s);
    },
    ...zoomProps,
  });

  const handleLayout = (e: LayoutChangeEvent) => {
    if (e.nativeEvent.layout.width !== width) {
        setWidth(e.nativeEvent.layout.width);
    }
  };

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
        <GestureDetector gesture={zoomGesture}>
          <View style={{ flex: 1 }} onLayout={onLayout} collapsable={false}>
            <Animated.View
              style={[contentContainerAnimatedStyle, { flex: 1 }]}
              onLayout={onLayoutContent}
            >
              <AnimatedFlashList
                ref={listRef}
                scrollEnabled={!isZoomed}
                onScroll={onScroll}
                scrollEventThrottle={16}
                renderItem={(info) => renderItem({ ...info, width })}
                {...flashListProps}
              />
            </Animated.View>
          </View>
        </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});
