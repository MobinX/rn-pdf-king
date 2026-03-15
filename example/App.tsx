import React, { useState } from 'react';
import { StyleSheet, View, Text, Button, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FlashList } from '@shopify/flash-list';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import { PdfDocumentProvider, usePdfDocument, PdfPage } from 'rn-pdf-king';
import Zoom from 'react-native-zoom-reanimated';

const ZoomablePage = ({ 
  pageNo, 
  width, 
  itemHeight, 
  setIsSelecting 
}: { 
  pageNo: number, 
  width: number, 
  itemHeight: number, 
  setIsSelecting: (v: boolean) => void 
}) => {
  const highlights = [
    { id: 'h1', startIndex: 10, endIndex: 50, color: 'rgba(255, 255, 0, 0.5)' },
    { id: 'h2', startIndex: 100, endIndex: 150, color: '#ff000088' },
  ]

  return (
    <PdfPage 
      pageNo={pageNo} 
      width={width}
      height={itemHeight}
      preDefinedHighlights={highlights}
      handleColor="green"
      selectionColor="rgba(0, 255, 0, 0.3)"
      style={{ width: width, height: itemHeight }} 
      onSelectionChanged={(e) => console.log('Selection:', e.nativeEvent.selectedText)}
      onSelectionStarted={() => setIsSelecting(true)}
      onSelectionEnded={() => setIsSelecting(false)}
      onPreDefinedHighlightClick={(e) => alert(`Highlight clicked: ${e.nativeEvent.id}`)}
    />
  );
};

const PdfViewer = () => {
  const { loading, pageCount, filePath, fileName, pickFile, error } = usePdfDocument();
  const [width, setWidth] = useState(Dimensions.get('window').width);
  const [isSelecting, setIsSelecting] = useState(false);
  const itemHeight = width * 1.414;

  const renderItem = ({ item }: { item: number }) => {
    return (
      <View style={{ width: width, height: itemHeight, marginBottom: 20, overflow: 'hidden' }}> 
        <ZoomablePage 
          pageNo={item} 
          width={width} 
          itemHeight={itemHeight} 
          setIsSelecting={setIsSelecting}
        />
        <Text style={{ textAlign: 'center', marginTop: 5 }}>Page {item}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size='large' />
        <Text>Loading PDF...</Text>
      </View>
    );
  }

  if (!filePath) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>No PDF loaded</Text>
        <Button title='Pick PDF File' onPress={pickFile} />
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Text style={styles.header}>{fileName} ({pageCount} pages)</Text>
      <View style={{ flex: 1, width: '100%' }}>
        <Zoom disabled={isSelecting}>
          <View style={{ width: width, height: '100%' }}>
            <FlashList
              data={Array.from({ length: pageCount }, (_, i) => i + 1)}
              renderItem={renderItem}
              estimatedItemSize={600}
              keyExtractor={(item) => item.toString()}
              scrollEnabled={!isSelecting}
            />
          </View>
        </Zoom>
      </View>
      <View style={{ padding: 20 }}>
         <Button title='Pick Another PDF' onPress={pickFile} />
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
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingTop: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginBottom: 20,
    fontSize: 18,
  },
  header: {
    fontSize: 16,
    fontWeight: 'bold',
    padding: 10,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  error: {
    color: 'red',
    marginTop: 10,
  },
});
