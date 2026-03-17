import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Button,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import {
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { FlashList } from "@shopify/flash-list";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import RnPdfKing, {
  PdfDocumentProvider,
  usePdfDocument,
  PdfPage,
} from "rn-pdf-king";
import { useZoomGesture } from "./zoom";

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

const ZoomablePage = ({
  pageNo,
  width,
  itemHeight,
  setIsSelecting,
  selectionEnabled,
}: {
  pageNo: number;
  width: number;
  itemHeight: number;
  setIsSelecting: (v: boolean) => void;
  selectionEnabled: boolean;
}) => {
  const highlights = [
    { id: "h1", startIndex: 0, endIndex: 100, color: "rgba(255, 235, 0, 0.5)" },
    { id: "h2", startIndex: 100, endIndex: 150, color: "#ff000088" },
  ];

  return (
    <PdfPage
      pageNo={pageNo}
      width={width}
      height={itemHeight}
      preDefinedHighlights={highlights}
      handleColor="green"
      selectionColor="rgba(0, 255, 0, 0.3)"
      style={{ width: width, height: itemHeight }}
      onSelectionChanged={(e) =>
        console.log("Selection:", e.nativeEvent.selectedText)
      }
      onSelectionStarted={() => setIsSelecting(true)}
      onSelectionEnded={() => setIsSelecting(false)}
      selectionEnabled={selectionEnabled}
      onPreDefinedHighlightClick={(e) =>
        alert(`Highlight clicked: ${e.nativeEvent.id}`)
      }
    />
  );
};

const PdfViewer = () => {
  const { loading, pageCount, filePath, fileName, pickFile, error } =
    usePdfDocument();
  const [width, setWidth] = useState(Dimensions.get("window").width);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionEnabled, setSelectionEnabled] = useState(true);
  const itemHeight = width * 1.414;
  const listRef = useAnimatedRef<FlashList<number>>();
  const [isZoomed, setIsZoomed] = useState(false);

  const {
    zoomGesture,
    contentContainerAnimatedStyle,
    onLayout,
    onLayoutContent,
    onScroll,
  } = useZoomGesture({
    disableVerticalPan: true,
    parentAnimatedScrollRef: listRef,
    onPanningEnd: () => {
      setSelectionEnabled(true);
    },
    onPanningStarted: () => {
      setSelectionEnabled(false);
    },
    onPinchingStarted: () => {
      setSelectionEnabled(false);
    },
    onPinchingStopped: () => {
      setSelectionEnabled(true);
    },
    onZoomChange: (s) => {
      const newIsZoomed = s > 1;
      if (newIsZoomed !== isZoomed) {
        setIsZoomed(newIsZoomed);
      }
    },
  });

  useEffect(() => {
    // Check initial intent on mount
    if (Platform.OS === "android") {
      RnPdfKing.checkInitialIntent();
    }
  }, []);

  const renderItem = ({ item }: { item: number }) => {
    return (
      <View
        style={{
          width: width,
          height: itemHeight,
          marginBottom: 20,
          overflow: "hidden",
        }}
      >
        <ZoomablePage
          pageNo={item}
          width={width}
          itemHeight={itemHeight}
          setIsSelecting={setIsSelecting}
          selectionEnabled={selectionEnabled}
        />
        <Text style={{ textAlign: "center", marginTop: 5 }}>Page {item}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading PDF...</Text>
      </View>
    );
  }

  if (!filePath) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>No PDF loaded</Text>
        <Button title="Pick PDF File" onPress={pickFile} />
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <Text style={styles.header}>
        {fileName} ({pageCount} pages)
      </Text>
      <View style={{ flex: 1, width: "100%" }}>
        <GestureDetector gesture={zoomGesture}>
          <View style={{ flex: 1 }} onLayout={onLayout} collapsable={false}>
            <Animated.View
              style={[contentContainerAnimatedStyle, { flex: 1 }]}
              onLayout={onLayoutContent}
            >
              <AnimatedFlashList
                ref={listRef}
                data={Array.from({ length: pageCount }, (_, i) => i + 1)}
                renderItem={renderItem}
                estimatedItemSize={itemHeight + 20}
                keyExtractor={(item) => item.toString()}
                scrollEnabled={!isZoomed && !isSelecting}
                onScroll={onScroll}
                scrollEventThrottle={16}
              />
            </Animated.View>
          </View>
        </GestureDetector>
      </View>
      <View style={{ padding: 20 }}>
        <Button title="Pick Another PDF" onPress={pickFile} />
      </View>
    </View>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PdfDocumentProvider>
        <View style={styles.mainContainer}>
          <PdfViewer />
        </View>
      </PdfDocumentProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    paddingTop: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    marginBottom: 20,
    fontSize: 18,
  },
  header: {
    fontSize: 16,
    fontWeight: "bold",
    padding: 10,
    textAlign: "center",
    backgroundColor: "#fff",
  },
  error: {
    color: "red",
    marginTop: 10,
  },
});
