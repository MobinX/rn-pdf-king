import React, { useState, createContext, useContext, useEffect } from 'react';
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

// Context for ZoomableList state
interface ZoomableListContextType {
  isZoomed: boolean;
  isPanning: boolean;
  isPinching: boolean;
  width: number;
}

const ZoomableListContext = createContext<ZoomableListContextType | undefined>(undefined);

export const useZoomableList = () => {
  const context = useContext(ZoomableListContext);
  if (!context) {
    throw new Error('useZoomableList must be used within a ZoomableList');
  }
  return context;
};

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
  const [isPanning, setIsPanning] = useState(false);
  const [isPinching, setIsPinching] = useState(false);

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
    ...zoomProps,
    onPanningStarted: () => {
      setIsPanning(true);
      zoomProps?.onPanningStarted?.();
    },
    onPanningEnd: () => {
      setIsPanning(false);
      zoomProps?.onPanningEnd?.();
    },
    onPinchingStarted: () => {
      setIsPinching(true);
      zoomProps?.onPinchingStarted?.();
    },
    onPinchingStopped: () => {
      setIsPinching(false);
      zoomProps?.onPinchingStopped?.();
    },
    onZoomChange: (s) => {
      const newIsZoomed = s > 1.05; // Small buffer
      if (newIsZoomed !== isZoomed) {
        setIsZoomed(newIsZoomed);
        onZoomStateChange?.(newIsZoomed);
      }
      onZoomChange?.(s);
    },
  });

  const handleLayout = (e: LayoutChangeEvent) => {
    if (e.nativeEvent.layout.width !== width) {
        setWidth(e.nativeEvent.layout.width);
    }
  };

  return (
    <ZoomableListContext.Provider value={{ isZoomed, isPanning, isPinching, width }}>
      <View style={[styles.container, style]} onLayout={handleLayout}>
          <GestureDetector gesture={zoomGesture}>
            <View style={{ flex: 1 }} onLayout={onLayout} collapsable={false}>
              <Animated.View
                style={[contentContainerAnimatedStyle, { flex: 1 }]}
                onLayout={onLayoutContent}
              >
                <AnimatedFlashList
                  ref={listRef}
                  scrollEnabled={!isZoomed && !isPanning && !isPinching}
                  onScroll={onScroll}
                  scrollEventThrottle={16}
                  renderItem={(info) => renderItem({ ...info, width })}
                  {...flashListProps}
                />
              </Animated.View>
            </View>
          </GestureDetector>
      </View>
    </ZoomableListContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});
