import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Button,
  ActivityIndicator,
  Platform,
} from "react-native";
import {
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import RnPdfKing, {
  PdfDocumentProvider,
  usePdfDocument,
  ZoomableList,
  ZoomablePdfPage,
} from "rn-pdf-king";

const PdfViewer = () => {
  const { loading, pageCount, filePath, fileName, pickFile, error } =
    usePdfDocument();
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    // Check initial intent on mount
    if (Platform.OS === "android") {
      RnPdfKing.checkInitialIntent();
    }
  }, []);

  const renderItem = ({ item, width }: { item: number; width: number }) => {
    const itemHeight = width * 1.414;
    
    const highlights = [
        { id: "h1", startIndex: 0, endIndex: 100, color: "rgba(255, 235, 0, 0.5)" },
        { id: "h2", startIndex: 100, endIndex: 150, color: "#ff000088" },
    ];

    return (
      <View
        style={{
          width: width,
          height: itemHeight,
          marginBottom: 20,
          overflow: "hidden",
        }}
      >
        <ZoomablePdfPage
            pageNo={item}
            width={width}
            height={itemHeight}
            preDefinedHighlights={highlights}
            handleColor="green"
            selectionColor="rgba(0, 255, 0, 0.3)"
            onSelectionChanged={(e) =>
                console.log("Selection:", e.nativeEvent.selectedText)
            }
            onSelectionStarted={() => setIsSelecting(true)}
            onSelectionEnded={() => setIsSelecting(false)}
            onPreDefinedHighlightClick={(e) =>
                alert(`Highlight clicked: ${e.nativeEvent.id}`)
            }
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
    <View style={styles.container}>
      <Text style={styles.header}>
        {fileName} ({pageCount} pages)
      </Text>
      <View style={{ flex: 1, width: "100%" }}>
        <ZoomableList
            data={Array.from({ length: pageCount }, (_, i) => i + 1)}
            renderItem={renderItem}
            estimatedItemSize={500}
            keyExtractor={(item) => item.toString()}
            scrollEnabled={!isSelecting}
        />
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
