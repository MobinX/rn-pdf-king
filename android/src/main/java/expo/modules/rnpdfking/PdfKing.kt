package com.mobinx.pdfking

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PointF
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import android.provider.OpenableColumns
import android.util.AttributeSet
import android.util.LruCache
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.View
import android.net.Uri
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.text.PDFTextStripper
import com.tom_roush.pdfbox.text.TextPosition
import java.io.File
import java.io.IOException
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt
import kotlin.math.abs
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.runBlocking

// --- Data Models ---

data class TextChar(
    val text: String,
    val rect: RectF,
    val unicode: String
)

data class Highlight(
    val id: String,
    val startIndex: Int,
    val endIndex: Int,
    val color: Int // Changed to Int for legacy Color
)

// --- Internal Text Extractor ---

private class InternalPdfTextExtractor : PDFTextStripper() {
    val textChars = mutableListOf<TextChar>()

    init {
        sortByPosition = true
    }

    @Throws(IOException::class)
    override fun processTextPosition(text: TextPosition) {
        val x = text.xDirAdj
        val y = text.yDirAdj
        val w = text.widthDirAdj
        val h = text.heightDir

        if (text.unicode != null && text.unicode.isNotEmpty()) {
            textChars.add(TextChar(
                text = text.unicode,
                rect = RectF(x, y, x + w, y + h),
                unicode = text.unicode
            ))
        }
        super.processTextPosition(text)
    }
}

// --- Main PdfKing Class (Manager) ---

class PdfKing(private val context: Context) {
    private var fileDescriptor: ParcelFileDescriptor? = null
    private var pdfRenderer: PdfRenderer? = null
    private var textDocument: PDDocument? = null
    
    private val pdfMutex = Mutex()
    private val bitmapCache = object : LruCache<Int, Bitmap>(10) { 
        override fun entryRemoved(evicted: Boolean, key: Int?, oldValue: Bitmap?, newValue: Bitmap?) {
             // Don't recycle here to avoid race conditions
        }
    }
    
    // Callbacks
    var onFileLoadStarted: (() -> Unit)? = null
    var onFileLoadSuccess: ((String, String, Int) -> Unit)? = null // Path/UriString, Name, PageCount
    var onUnsupportedFile: (() -> Unit)? = null

    init {
        PDFBoxResourceLoader.init(context)
    }

    // --- File Picker Integration (Legacy support via manual intent if needed) ---
    // Note: Compose RegisterFilePicker removed. Caller must handle file picking.
    
    // Helper to process Uri if passed from Activity
    suspend fun handleUriSelection(uri: Uri) {
        onFileLoadStarted?.invoke()
        var success = false
        var fileName = ""
        var filePath = ""
        var pageCount = 0

        withContext(Dispatchers.IO) {
             try {
                fileName = resolveDisplayName(uri)
                val cacheFile = File(context.cacheDir, "temp_pdfking_doc.pdf")
                
                val inputStream = context.contentResolver.openInputStream(uri)
                if (inputStream != null) {
                    inputStream.use { input ->
                        cacheFile.outputStream().use { output ->
                            input.copyTo(output)
                        }
                    }
                    
                    loadPdf(cacheFile)
                    pageCount = getPageCount()
                    filePath = cacheFile.absolutePath
                    success = true
                }
            } catch (e: Exception) {
                e.printStackTrace()
                success = false
            }
        }
        
        // Callback on Main Thread (assuming caller context)
        // Since we are suspending, we rely on caller to be in coroutine
        withContext(Dispatchers.Main) {
            if (success) {
                onFileLoadSuccess?.invoke(filePath, fileName, pageCount)
            } else {
                onUnsupportedFile?.invoke()
            }
        }
    }
    
    private fun resolveDisplayName(uri: Uri): String {
        var name = "Document.pdf"
        try {
            context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (index >= 0) {
                        name = cursor.getString(index)
                    }
                }
            }
        } catch (e: Exception) {
            // Ignore
        }
        return name
    }

    // --- API Methods ---

    suspend fun loadPdf(pdfFile: File) {
        pdfMutex.withLock {
            closePdf() 
            val descriptor = ParcelFileDescriptor.open(pdfFile, ParcelFileDescriptor.MODE_READ_ONLY)
            val renderer = PdfRenderer(descriptor)
            try {
                textDocument = PDDocument.load(pdfFile)
                pdfRenderer = renderer
                fileDescriptor = descriptor
                bitmapCache.evictAll() 
            } catch (error: Exception) {
                renderer.close()
                descriptor.close()
                throw error
            }
        }
    }

    suspend fun getPageCount(): Int = pdfMutex.withLock { pdfRenderer?.pageCount ?: 0 }

    // Sync version for callers that need it (wrapping suspend)
    fun getPageCountSync(): Int = runBlocking { getPageCount() }

    suspend fun getPageBitmap(pageNo: Int): Bitmap {
        synchronized(bitmapCache) {
             val cached = bitmapCache.get(pageNo)
             if (cached != null && !cached.isRecycled) return cached
        }

        return withContext(Dispatchers.IO) {
            pdfMutex.withLock {
                synchronized(bitmapCache) {
                     val cached = bitmapCache.get(pageNo)
                     if (cached != null && !cached.isRecycled) return@withLock cached
                }

                val renderer = requireNotNull(pdfRenderer) { "No PDF loaded. Please choose a PDF file first." }
                require(pageNo in 1..renderer.pageCount) {
                    "Page number must be between 1 and ${renderer.pageCount}."
                }
                
                renderer.openPage(pageNo - 1).use { page ->
                    val bitmap = Bitmap.createBitmap(page.width, page.height, Bitmap.Config.ARGB_8888)
                    bitmap.eraseColor(Color.WHITE)
                    page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                    
                    synchronized(bitmapCache) {
                        bitmapCache.put(pageNo, bitmap)
                    }
                    bitmap
                }
            }
        }
    }
    
    suspend fun getTextChars(pageNo: Int): List<TextChar> {
        return withContext(Dispatchers.IO) {
            pdfMutex.withLock {
                val document = requireNotNull(textDocument) { "No PDF loaded. Please choose a PDF file first." }
                require(pageNo in 1..document.numberOfPages) {
                    "Page number must be between 1 and ${document.numberOfPages}."
                }

                val stripper = InternalPdfTextExtractor().apply {
                    startPage = pageNo
                    endPage = pageNo
                }

                stripper.getText(document)
                stripper.textChars
            }
        }
    }

    suspend fun getPageBitmapBase64(pageNo: Int): String {
        val bitmap = getPageBitmap(pageNo)
        val outputStream = java.io.ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
        val byteArray = outputStream.toByteArray()
        return android.util.Base64.encodeToString(byteArray, android.util.Base64.NO_WRAP)
    }

    suspend fun getPageText(pageNo: Int): String {
        return withContext(Dispatchers.IO) {
            pdfMutex.withLock {
                val document = requireNotNull(textDocument) { "No PDF loaded. Please choose a PDF file first." }
                require(pageNo in 1..document.numberOfPages) {
                    "Page number must be between 1 and ${document.numberOfPages}."
                }

                val stripper = PDFTextStripper().apply {
                    startPage = pageNo
                    endPage = pageNo
                }
                stripper.getText(document)
            }
        }
    }

    fun closePdf() {
        try {
             pdfRenderer?.close()
             pdfRenderer = null
             fileDescriptor?.close()
             fileDescriptor = null
             textDocument?.close()
             textDocument = null
             bitmapCache.evictAll()
        } catch(e: Exception) {
             e.printStackTrace()
        }
    }
}

// --- PdfKing Manager Singleton ---

object PdfKingManager {
    private var instance: PdfKing? = null
    
    fun initialize(context: Context) {
        if (instance == null) {
            instance = PdfKing(context.applicationContext)
        }
    }
    
    fun getInstance(): PdfKing {
        return instance ?: throw IllegalStateException("PdfKingManager not initialized. Call initialize(context) first.")
    }
}

// --- Legacy View Implementation ---

class PdfPageView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var bitmap: Bitmap? = null
    private var textChars: List<TextChar> = emptyList()
    var preDefinedHighlights: List<Highlight> = emptyList()
        set(value) { field = value; invalidate() }

    // Selection State
    private var selectionStart: Int? = null
    private var selectionEnd: Int? = null
    
    // Config
    var handleColor: Int = Color.BLUE
    var selectionColor: Int = Color.argb(77, 0, 0, 255) // 0.3 alpha blue (approx 77/255)
    var selectionEnabled: Boolean = true
    
    // Callbacks
    var onSelectionChanged: ((String, Int?, Int?, PointF?, PointF?, PointF?, PointF?) -> Unit)? = null
    var onHighlightClick: ((String) -> Unit)? = null
    var onSelectionStart: (() -> Unit)? = null
    var onSelectionEnd: (() -> Unit)? = null
    
    // Internal State
    private var scale: Float = 1f
    private var draggingHandle: HandleType? = null
    private var isInteractingWithSelection: Boolean = false
    private var isPanning: Boolean = false
    private var startRawX: Float = 0f
    private var startRawY: Float = 0f
    private val longPressHandler = android.os.Handler(android.os.Looper.getMainLooper())
    private var longPressRunnable: Runnable? = null
    
    // Paints
    private val selectionPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }
    private val highlightPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }
    private val handleLinePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 5f
    }
    private val handleCirclePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }
    private val bitmapPaint = Paint(Paint.ANTI_ALIAS_FLAG)

    private enum class HandleType { START, END }
    private val touchSlop = android.view.ViewConfiguration.get(context).scaledTouchSlop

    private val gestureDetector = GestureDetector(context, object : GestureDetector.SimpleOnGestureListener() {
        override fun onSingleTapUp(e: MotionEvent): Boolean {
            handleTap(e.x, e.y)
            return true
        }
        
        override fun onLongPress(e: MotionEvent) {
            if (!isPanning && selectionEnabled) {
                handleLongPress(e.x, e.y)
            }
        }
        
        override fun onDown(e: MotionEvent): Boolean = true
    })

    fun setContent(bmp: Bitmap, chars: List<TextChar>) {
        this.bitmap = bmp
        this.textChars = chars
        requestLayout()
        invalidate()
    }
    
    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val widthMode = MeasureSpec.getMode(widthMeasureSpec)
        val widthSize = MeasureSpec.getSize(widthMeasureSpec)
        
        val width = widthSize // Match parent/width constraint
        
        val heightMode = MeasureSpec.getMode(heightMeasureSpec)
        val heightSize = MeasureSpec.getSize(heightMeasureSpec)
        
        val height: Int
        if (heightMode == MeasureSpec.EXACTLY) {
            height = heightSize
        } else if (bitmap != null && bitmap!!.width > 0) {
            val aspect = bitmap!!.width.toFloat() / bitmap!!.height.toFloat()
            height = (width / aspect).toInt()
        } else {
             // Fallback if no exact height and no bitmap: assume standard A4 ratio (1/1.414)
             height = (width * 1.414).toInt() 
        }
        
        setMeasuredDimension(width, height)
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val bmp = bitmap ?: return
        
        // Calculate scale
        if (bmp.width > 0) {
            scale = width.toFloat() / bmp.width.toFloat()
        }
        
        // Draw Bitmap
        val dstRect = Rect(0, 0, width, height)
        canvas.drawBitmap(bmp, null, dstRect, bitmapPaint)
        
        // Draw Pre-defined Highlights
        preDefinedHighlights.forEach { highlight ->
            highlightPaint.color = highlight.color
            drawHighlightRange(canvas, highlight.startIndex, highlight.endIndex, highlightPaint)
        }
        
        // Draw Selection
        if (selectionStart != null && selectionEnd != null) {
            selectionPaint.color = selectionColor
            drawHighlightRange(canvas, selectionStart!!, selectionEnd!!, selectionPaint)
            
            // Draw Handles
            val s = min(selectionStart!!, selectionEnd!!)
            val e = max(selectionStart!!, selectionEnd!!)
            
            handleLinePaint.color = handleColor
            handleCirclePaint.color = handleColor
            
            // Only draw start handle if valid char
            if (s in textChars.indices) {
                drawHandle(canvas, s, true)
            }
            // Only draw end handle if valid char
            if (e in textChars.indices) {
                drawHandle(canvas, e, false)
            }
        }
    }
    
    private fun drawHighlightRange(canvas: Canvas, start: Int, end: Int, paint: Paint) {
        val safeStart = max(0, start)
        val safeEnd = min(textChars.size - 1, end)
        
        if (safeStart <= safeEnd) {
            for (i in safeStart..safeEnd) {
                if (i in textChars.indices) {
                    val r = textChars[i].rect
                    val rect = RectF(
                        r.left * scale,
                        r.top * scale,
                        r.right * scale, // r.right is x+w
                        r.bottom * scale // r.bottom is y+h
                    )
                    canvas.drawRect(rect, paint)
                }
            }
        }
    }
    
    private fun drawHandle(canvas: Canvas, index: Int, isStart: Boolean) {
        if (index !in textChars.indices) return
        
        val pos = getHandlePosition(index, isStart)
        val r = textChars[index].rect
        val topY = r.top * scale
        
        // Line from bottom (pos.y) to top (topY)
        canvas.drawLine(pos.x, pos.y, pos.x, topY, handleLinePaint)
        canvas.drawCircle(pos.x, pos.y, 20f, handleCirclePaint)
    }
 
    private fun getHandlePosition(index: Int, isStart: Boolean): PointF {
        if (index !in textChars.indices) return PointF(0f, 0f)
        val r = textChars[index].rect
        val x = if (isStart) r.left else r.right 
        val y = r.bottom
        return PointF(x * scale, y * scale)
    }
 
    private fun getCharIndexAt(x: Float, y: Float): Int? {
        if (textChars.isEmpty()) return null
        val pdfX = x / scale
        val pdfY = y / scale
        val padding = 10f
        
        // Exact match
        val exactMatch = textChars.indexOfFirst { char ->
            val r = char.rect
            // rect in textChars is PDF coords
            pdfX >= r.left - padding && pdfX <= r.right + padding &&
            pdfY >= r.top - padding && pdfY <= r.bottom + padding
        }
        if (exactMatch != -1) return exactMatch
 
        // Proximity match
        var minDistance = Float.MAX_VALUE
        var closestIndex = -1
        val maxDistSq = 25f * 25f
 
        textChars.forEachIndexed { index, char ->
            val cx = char.rect.centerX()
            val cy = char.rect.centerY()
            val dx = cx - pdfX
            val dy = cy - pdfY
            val distSq = dx * dx + dy * dy
            if (distSq < minDistance) {
                minDistance = distSq
                closestIndex = index
            }
        }
        return if (minDistance < maxDistSq) closestIndex else null
    }
 
    private fun getHighlightAt(index: Int): String? {
        return preDefinedHighlights.firstOrNull { highlight ->
            index >= highlight.startIndex && index <= highlight.endIndex
        }?.id
    }
 
    private fun updateSelection(s: Int, e: Int) {
        val start = min(s, e)
        val end = max(s, e)
 
        if (selectionStart == start && selectionEnd == end) return
 
        selectionStart = start
        selectionEnd = end
        
        val sb = StringBuilder()
        for (i in start..end) {
            if (i in textChars.indices) {
                sb.append(textChars[i].text)
            }
        }
        
        val startChar = textChars.getOrNull(start)
        val endChar = textChars.getOrNull(end)
 
        val startPdf = if (startChar != null) PointF(startChar.rect.left, startChar.rect.bottom) else null
        val endPdf = if (endChar != null) PointF(endChar.rect.right, endChar.rect.bottom) else null
        
        var startScreen: PointF? = null
        var endScreen: PointF? = null
        
        // Screen coords relative to this view
        if (startPdf != null) {
            startScreen = PointF(startPdf.x * scale, startPdf.y * scale)
        }
        if (endPdf != null) {
             endScreen = PointF(endPdf.x * scale, endPdf.y * scale)
        }
        
        val location = IntArray(2)
        getLocationOnScreen(location)
        if (startScreen != null) {
            startScreen.offset(location[0].toFloat(), location[1].toFloat())
        }
        if (endScreen != null) {
            endScreen.offset(location[0].toFloat(), location[1].toFloat())
        }
 
        onSelectionChanged?.invoke(sb.toString(), start, end, startPdf, endPdf, startScreen, endScreen)
        invalidate()
    }
    
    private fun handleTap(x: Float, y: Float) {
        val index = getCharIndexAt(x, y)
        if (index != null) {
            val highlightId = getHighlightAt(index)
            if (highlightId != null) {
                onHighlightClick?.invoke(highlightId)
                return
            }
        }
        if (selectionStart != null || selectionEnd != null) {
            selectionStart = null
            selectionEnd = null
            onSelectionChanged?.invoke("", null, null, null, null, null, null)
            onSelectionEnd?.invoke()
            invalidate()
        }
    }
    
    private fun handleLongPress(x: Float, y: Float) {
        if (isPanning) return
        val index = getCharIndexAt(x, y) ?: return
        
        var s = index
        while (s > 0 && s < textChars.size && textChars[s - 1].text.isNotBlank() && textChars[s - 1].text != " ") {
            s--
        }
        var e = index
        while (e < textChars.size - 1 && textChars[e + 1].text.isNotBlank() && textChars[e + 1].text != " ") {
            e++
        }
        updateSelection(s, e)
        isInteractingWithSelection = true
        onSelectionStart?.invoke()
        parent?.requestDisallowInterceptTouchEvent(true)
    }
 
    override fun onTouchEvent(event: MotionEvent): Boolean {
        // Multi-touch handling (pinch zoom)
        if (event.pointerCount > 1) {
            if (draggingHandle != null || isInteractingWithSelection) {
                clearSelectionState()
            }
            return false // Let parent handle pinch
        }

        val gestureHandled = gestureDetector.onTouchEvent(event)

        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                startRawX = event.rawX
                startRawY = event.rawY
                isPanning = false
                
                val x = event.x
                val y = event.y
                
                // Check if we hit a selection handle
                if (selectionEnabled) {
                    val s = selectionStart
                    val e = selectionEnd
                    val touchRadius = 60f
                
                    if (s != null && s in textChars.indices) {
                        val pos = getHandlePosition(s, true)
                        if (sqrt((x - pos.x).pow(2) + (y - pos.y).pow(2)) < touchRadius) {
                            draggingHandle = HandleType.START
                            isInteractingWithSelection = true
                            onSelectionStart?.invoke()
                            parent?.requestDisallowInterceptTouchEvent(true)
                            return true
                        }
                    }
                
                    if (e != null && e in textChars.indices) {
                        val pos = getHandlePosition(e, false)
                        if (sqrt((x - pos.x).pow(2) + (y - pos.y).pow(2)) < touchRadius) {
                            draggingHandle = HandleType.END
                            isInteractingWithSelection = true
                            onSelectionStart?.invoke()
                            parent?.requestDisallowInterceptTouchEvent(true)
                            return true
                        }
                    }
                }
                
                return true // Always return true on DOWN to receive MOVE/UP and long press
            }
            MotionEvent.ACTION_MOVE -> {
                val dxRaw = abs(event.rawX - startRawX)
                val dyRaw = abs(event.rawY - startRawY)
                
                if (dxRaw > touchSlop || dyRaw > touchSlop) {
                    if (!isInteractingWithSelection) {
                        isPanning = true
                    }
                }

                if (isInteractingWithSelection && selectionEnabled) {
                    val index = getCharIndexAt(event.x, event.y)
                    if (index != null) {
                        val s = selectionStart ?: index
                        val e = selectionEnd ?: index
                        
                        if (draggingHandle == HandleType.START) {
                            if (index > e) {
                                updateSelection(e, index)
                                draggingHandle = HandleType.END
                            } else {
                                updateSelection(index, e)
                            }
                        } else {
                            if (index < s) {
                                updateSelection(index, s)
                                draggingHandle = HandleType.START
                            } else {
                                updateSelection(s, index)
                            }
                        }
                    }
                    return true
                }
                
                // If we are panning and not selecting, return false to encourage parent interception (scrolling)
                return !isPanning
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                if (isInteractingWithSelection) {
                    isInteractingWithSelection = false
                    draggingHandle = null
                    onSelectionEnd?.invoke()
                    parent?.requestDisallowInterceptTouchEvent(false)
                    return true
                }
                isPanning = false
                return gestureHandled
            }
        }
        return gestureHandled
    }

    private fun clearSelectionState() {
        draggingHandle = null
        isInteractingWithSelection = false
        selectionStart = null
        selectionEnd = null
        onSelectionChanged?.invoke("", null, null, null, null, null, null)
        onSelectionEnd?.invoke()
        invalidate()
        parent?.requestDisallowInterceptTouchEvent(false)
    }

    private fun Float.pow(n: Int): Float = Math.pow(this.toDouble(), n.toDouble()).toFloat()
}
