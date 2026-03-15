import React, { useState } from 'react';
import { StyleSheet, View, Text, Button, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { PdfDocumentProvider, usePdfDocument, PdfPage } from 'rn-pdf-king';

const PdfViewer = () => {
  const { loading, pageCount, filePath, fileName, pickFile, error } = usePdfDocument();
  const [width, setWidth] = useState(Dimensions.get('window').width);
  const itemHeight = width * 1.414;

  const renderItem = ({ item }: { item: number }) => {
    return (
    <View style={{ width: width, height: itemHeight, marginBottom: 20 }}> 
      <PdfPage 
        pageNo={item} 
        width={width}
        height={itemHeight}
        style={{ width: '100%', height: '100%' }} 
        onSelectionChanged={(e) => console.log('Selection:', e.nativeEvent.selectedText)}
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
        <FlashList
          data={Array.from({ length: pageCount }, (_, i) => i + 1)}
          renderItem={renderItem}
          estimatedItemSize={itemHeight + 40} // height + margin + text
          keyExtractor={(item) => item.toString()}
        />
      </View>
      <View style={{ padding: 20 }}>
         <Button title='Pick Another PDF' onPress={pickFile} />
      </View>
    </View>
  );
};

export default function App() {
  return (
    <PdfDocumentProvider>
      <View style={styles.mainContainer}>
        <PdfViewer />
      </View>
    </PdfDocumentProvider>
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
