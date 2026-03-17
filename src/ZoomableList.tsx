import React, {
  useMemo,
  useRef,
  useState,
  createContext,
  useContext,
} from "react";
import {
  StyleProp,
  ViewStyle,
  View,
  LayoutChangeEvent,
  StyleSheet,
  Text,
} from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  scrollTo,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { useZoomGesture, UseZoomGestureProps } from "./zoom/index";
import {
  FlashList,
  FlashListProps,
  ListRenderItemInfo,
} from "@shopify/flash-list";

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

const PAGE_SLIDER_PADDING_Y = 16;
const PAGE_SLIDER_THUMB_SIZE = 28;

// Context for ZoomableList state
interface ZoomableListContextType {
  isZoomed: boolean;
  isPanning: boolean;
  isPinching: boolean;
  width: number;
}

const ZoomableListContext = createContext<ZoomableListContextType | undefined>(
  undefined,
);

export const useZoomableList = () => {
  const context = useContext(ZoomableListContext);
  if (!context) {
    throw new Error("useZoomableList must be used within a ZoomableList");
  }
  return context;
};

export interface ZoomableListProps<T> extends Omit<
  FlashListProps<T>,
  "renderItem"
> {
  renderItem: (
    info: ListRenderItemInfo<T> & { width: number },
  ) => React.ReactElement | null;
  style?: StyleProp<ViewStyle>;
  zoomProps?: Omit<UseZoomGestureProps, "parentAnimatedScrollRef">;
  onZoomChange?: (scale: number) => void;
  onZoomStateChange?: (isZoomed: boolean) => void;
  /**
   * Google Drive-style page scrubber on the right side.
   * Works best for "page" lists where each item is a page.
   */
  pageSliderEnabled?: boolean;
  /**
   * Label renderer for the bubble. Defaults to "current/total".
   * current is 1-based.
   */
  pageSliderLabel?: (current: number, total: number) => string;
  /**
   * Logo/Icon for the slider thumb.
   */
  pageSliderLogo?: React.ReactNode;
}

export function ZoomableList<T>(props: ZoomableListProps<T>) {
  const {
    style,
    zoomProps,
    onZoomChange,
    onZoomStateChange,
    renderItem,
    pageSliderEnabled = false,
    pageSliderLabel,
    pageSliderLogo,
    ...flashListProps
  } = props;

  const [width, setWidth] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubIndex, setScrubIndex] = useState(0);
  const [trackHeight, setTrackHeight] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);

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

  const totalCount = flashListProps.data?.length ?? 0;
  const sliderEnabled = pageSliderEnabled && totalCount > 1;
  const bubbleText = (
    pageSliderLabel ?? ((cur: number, total: number) => `${cur}/${total}`)
  )((isScrubbing ? scrubIndex : currentIndex) + 1, totalCount);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      const first = viewableItems?.find(
        (v) => typeof v.index === "number" && v.index !== null,
      );
      if (first?.index != null) setCurrentIndex(first.index);
    },
  ).current;

  const viewabilityConfig = useMemo(
    () => ({
      itemVisiblePercentThreshold: 55,
      minimumViewTime: 60,
    }),
    [],
  );

  const thumbY = useSharedValue(0);
  const bubbleOpacity = useSharedValue(0);
  const contentHeight = useSharedValue(0);
  const viewportHeight = useSharedValue(0);

  const handleScroll = (e: any) => {
    // Keep zoom gesture bookkeeping intact
    onScroll?.(e);
    // Preserve consumer scroll handler if provided
    (flashListProps as any).onScroll?.(e);

    const ne = e?.nativeEvent;
    if (ne) {
      contentHeight.value = ne.contentSize?.height ?? 0;
      viewportHeight.value = ne.layoutMeasurement?.height ?? 0;
    }

    if (!sliderEnabled || trackHeight <= 0) return;

    if (!isScrubbing) {
      // Show bubble while panning/scrolling and hide after 1s of inactivity
      bubbleOpacity.value = 1;
      bubbleOpacity.value = withDelay(1000, withTiming(0, { duration: 300 }));
    }

    const offsetY = ne?.contentOffset?.y ?? 0;
    const contentH = ne?.contentSize?.height ?? 0;
    const viewportH = ne?.layoutMeasurement?.height ?? 0;
    const scrollable = Math.max(1, contentH - viewportH);
    const ratio = Math.max(0, Math.min(1, offsetY / scrollable));
    thumbY.value = ratio * trackHeight;
    if (!hasScrolled) setHasScrolled(true);
  };

  useDerivedValue(() => {
    if (
      !sliderEnabled ||
      isScrubbing ||
      hasScrolled ||
      trackHeight <= 0 ||
      totalCount <= 1
    )
      return;
    const ratio = currentIndex / (totalCount - 1);
    thumbY.value = ratio * trackHeight;
  }, [
    currentIndex,
    isScrubbing,
    sliderEnabled,
    totalCount,
    trackHeight,
    hasScrolled,
  ]);

  const updateScrubFromY = (y: number) => {
    if (!sliderEnabled || trackHeight <= 0) return;
    // Gesture y is relative to the track view; normalize into usable range.
    const normalized = y - PAGE_SLIDER_PADDING_Y;
    const clamped = Math.max(0, Math.min(trackHeight, normalized));
    const ratio = trackHeight > 0 ? clamped / trackHeight : 0;
    const idx = Math.max(
      0,
      Math.min(totalCount - 1, Math.round(ratio * (totalCount - 1))),
    );
    setScrubIndex(idx);
  };

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .manualActivation(true)
      .onTouchesDown((_e, manager) => {
        manager.activate();
      })
      .enabled(sliderEnabled && !isZoomed && !isPanning && !isPinching)
      .onBegin(() => {
        bubbleOpacity.value = 1;
        runOnJS(setIsScrubbing)(true);
      })
      .onUpdate((e) => {
        // keep thumbY in the same normalized coordinate space as trackHeight
        const y = Math.max(
          0,
          Math.min(trackHeight, e.y - PAGE_SLIDER_PADDING_Y),
        );
        thumbY.value = y;

        if (trackHeight > 0) {
          const ratio = y / trackHeight;
          const scrollableHeight = contentHeight.value - viewportHeight.value;
          if (scrollableHeight > 0) {
            scrollTo(listRef, 0, ratio * scrollableHeight, true);
          }
        }

        runOnJS(updateScrubFromY)(e.y);
      })
      .onEnd(() => {
        bubbleOpacity.value = withTiming(0, { duration: 300 });
        runOnJS(setIsScrubbing)(false);
      })
      .onFinalize(() => {
        bubbleOpacity.value = withTiming(0, { duration: 300 });
        runOnJS(setIsScrubbing)(false);
      });
  }, [
    bubbleOpacity,
    isPanning,
    isPinching,
    isZoomed,
    sliderEnabled,
    thumbY,
    trackHeight,
    totalCount,
    contentHeight,
    viewportHeight,
    listRef,
  ]);

  const thumbStyle = useAnimatedStyle(() => {
    const y =
      trackHeight > 0 ? Math.max(0, Math.min(trackHeight, thumbY.value)) : 0;
    return {
      transform: [{ translateY: y + PAGE_SLIDER_PADDING_Y }],
    };
  }, [trackHeight]);

  const bubbleStyle = useAnimatedStyle(() => {
    const y =
      trackHeight > 0 ? Math.max(0, Math.min(trackHeight, thumbY.value)) : 0;
    return {
      opacity: bubbleOpacity.value,
      transform: [{ translateY: y + PAGE_SLIDER_PADDING_Y }],
    };
  });

  return (
    <ZoomableListContext.Provider
      value={{ isZoomed, isPanning, isPinching, width }}
    >
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
                scrollEventThrottle={16}
                renderItem={(info) => renderItem({ ...info, width })}
                {...flashListProps}
                onScroll={handleScroll}
                onViewableItemsChanged={
                  sliderEnabled
                    ? (onViewableItemsChanged as any)
                    : flashListProps.onViewableItemsChanged
                }
                viewabilityConfig={
                  sliderEnabled
                    ? (viewabilityConfig as any)
                    : flashListProps.viewabilityConfig
                }
              />
            </Animated.View>
          </View>
        </GestureDetector>

        {sliderEnabled ? (
          <View pointerEvents="box-none" style={styles.pageSliderOverlay}>
            <View style={styles.pageSliderGestureContainer}>
              <GestureDetector gesture={panGesture}>
                <View
                  style={styles.pageSliderTrack}
                  collapsable={false}
                  onLayout={(e) => {
                    const h = e.nativeEvent.layout.height;
                    const usable = Math.max(
                      0,
                      h - PAGE_SLIDER_PADDING_Y * 2 - PAGE_SLIDER_THUMB_SIZE,
                    );
                    setTrackHeight(usable);
                  }}
                >
                  <Animated.View style={[styles.pageSliderBubble, bubbleStyle]}>
                    <Text style={styles.pageSliderBubbleText}>
                      {bubbleText}
                    </Text>
                  </Animated.View>
                  <Animated.View style={[styles.pageSliderThumb, thumbStyle]}>
                    {pageSliderLogo}
                  </Animated.View>
                </View>
              </GestureDetector>
            </View>
          </View>
        ) : null}
      </View>
    </ZoomableListContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  pageSliderOverlay: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 10,
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  pageSliderGestureContainer: {
    flex: 1,
    alignSelf: "stretch",
    alignItems: "flex-end",
  },
  pageSliderTrack: {
    flex: 1,
    width: 10,
    alignItems: "flex-end",
    justifyContent: "flex-start",
    paddingVertical: 16,
  },
  pageSliderThumb: {
    position: "absolute",
    right: 2,
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  pageSliderBubble: {
    position: "absolute",
    right: 38,
    minWidth: 80,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.82)",
    alignItems: "center",
    justifyContent: "center",
  },
  pageSliderBubbleText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
