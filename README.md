# rn-pdf-king

The ultimate PDF library for React Native and Expo. Efficiently handles large PDFs (1000+ pages) with memory management, smooth text selection, customizable highlights, and system-level file integration.

## Features

- 🚀 **High Performance:** Memory-efficient rendering for large documents.
- 🔍 **Text Selection:** Native text selection with customizable handles and selection colors.
- 🖍️ **Highlights:** Support for predefined highlights with click events.
- 📁 **System Integration:** Open PDFs directly from other apps via system intents.
- 📱 **Expo Compatible:** Built with Expo Modules API.
- 🔭 **Zoom Ready:** Works seamlessly with `react-native-zoom-reanimated` or `react-native-zoom-toolkit`.

## Installation

```bash
bun add rn-pdf-king
```

*Note: Ensure you have `react-native-gesture-handler` and `react-native-reanimated` installed if you plan to use zooming features.*

## Configuration (Android Only)

To allow your app to open PDF files from the system, add the following to your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "category": ["DEFAULT", "BROWSABLE"],
          "data": [
            { "scheme": "file", "mimeType": "application/pdf" },
            { "scheme": "content", "mimeType": "application/pdf" }
          ]
        }
      ]
    }
  }
}
```

Then run `npx expo prebuild`.

## Usage

### 1. Setup Provider
Wrap your application with `PdfDocumentProvider` to manage document state.

```tsx
import { PdfDocumentProvider } from 'rn-pdf-king';

export default function App() {
  return (
    <PdfDocumentProvider>
      <MyPdfViewer />
    </PdfDocumentProvider>
  );
}
```

### 2. Access Document State
Use the `usePdfDocument` hook to handle file picking and monitor loading states.

```tsx
import { usePdfDocument } from 'rn-pdf-king';

const MyPdfViewer = () => {
  const { 
    loading, 
    pageCount, 
    filePath, 
    fileName, 
    pickFile, 
    error 
  } = usePdfDocument();

  if (loading) return <ActivityIndicator />;
  if (!filePath) return <Button title="Pick PDF" onPress={pickFile} />;

  return <Text>Loaded: {fileName}</Text>;
};
```

### 3. Render PDF Pages
Use the `PdfPage` component to display specific pages. It supports advanced features like text selection and highlights.

```tsx
import { PdfPage } from 'rn-pdf-king';

<PdfPage 
  pageNo={1} 
  width={300}
  height={424}
  handleColor="green"
  selectionColor="rgba(0, 255, 0, 0.3)"
  preDefinedHighlights={[
    { id: 'h1', startIndex: 10, endIndex: 50, color: 'yellow' }
  ]}
  onSelectionChanged={(e) => console.log('Selected:', e.nativeEvent.selectedText)}
  onPreDefinedHighlightClick={(e) => alert(`Clicked highlight: ${e.nativeEvent.id}`)}
/>
```

### 4. Handling System Intents
To handle PDFs opened from other apps, check the initial intent on mount.

```tsx
import RnPdfKing from 'rn-pdf-king';

useEffect(() => {
  if (Platform.OS === 'android') {
    RnPdfKing.checkInitialIntent();
  }
}, []);
```

## API Reference

### `PdfPage` Props

| Prop | Type | Description |
| :--- | :--- | :--- |
| `pageNo` | `number` | The page number to render (1-indexed). |
| `width` | `number` | Page width. |
| `height` | `number` | Page height. |
| `preDefinedHighlights` | `Highlight[]` | Array of highlights to render on the page. |
| `handleColor` | `ColorValue` | Color of the selection handles. |
| `selectionColor` | `ColorValue` | Color of the selection rectangle. |
| `onSelectionChanged` | `Function` | Callback triggered when text selection changes. |
| `onSelectionStarted` | `Function` | Callback triggered when selection starts (long press). |
| `onSelectionEnded` | `Function` | Callback triggered when selection ends. |
| `onPreDefinedHighlightClick` | `Function` | Callback triggered when a highlight is tapped. |

### `Highlight` Object

| Key | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique identifier for the highlight. |
| `startIndex` | `number` | Character start index. |
| `endIndex` | `number` | Character end index. |
| `color` | `ColorValue` | Background color of the highlight. |

## License

MIT
