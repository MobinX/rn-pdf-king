package expo.modules.rnpdfking

import android.content.Context
import android.graphics.Bitmap
import android.os.Handler
import android.os.Looper
import android.view.ViewGroup
import android.widget.FrameLayout
import com.mobinx.pdfking.PdfKing
import com.mobinx.pdfking.PdfPageView
import com.mobinx.pdfking.PdfKingManager
import com.mobinx.pdfking.TextChar
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import expo.modules.kotlin.viewevent.EventDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel

class RnPdfKingView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
    private val onSelectionChanged by EventDispatcher()
    private val onSelectionStarted by EventDispatcher()
    private val onSelectionEnded by EventDispatcher()
    private val onPreDefinedHighlightClick by EventDispatcher()

    private var pageNo = 0
    private var viewWidth = 0
    private var viewHeight = 0
    private var viewMode = "page"
    
    private val pdfPageView = PdfPageView(context)
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var renderJob: Job? = null
    
    // State to hold latest data
    private var currentBitmap: Bitmap? = null
    private var currentTextChars: List<TextChar> = emptyList()

    init {
        val layoutParams = FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
        pdfPageView.layoutParams = layoutParams
        
        pdfPageView.onSelectionChanged = { text, p1, p2, p3, p4 ->
            if (text.isNotEmpty()) {
                onSelectionChanged(mapOf("selectedText" to text))
            }
        }
        
        pdfPageView.onSelectionStart = {
            onSelectionStarted(mapOf())
        }
        
        pdfPageView.onSelectionEnd = {
            onSelectionEnded(mapOf())
        }

        pdfPageView.onHighlightClick = { id ->
            onPreDefinedHighlightClick(mapOf("id" to id))
        }
        
        addView(pdfPageView)
    }

    fun setHandleColor(color: Int) {
        pdfPageView.handleColor = color
    }

    fun setSelectionColor(color: Int) {
        pdfPageView.selectionColor = color
    }

    fun setSelectionEnabled(enabled: Boolean) {
        pdfPageView.selectionEnabled = enabled
    }
    
    private fun render() {
        if (viewMode == "manager") {
            // Manager mode logic (if any specific view is needed)
            // For now, it's just a placeholder or invisible
            return
        }

        if (pageNo <= 0) return

        renderJob?.cancel()
        renderJob = scope.launch {
             try {
                 val pdfKing = try {
                     PdfKingManager.getInstance()
                 } catch (e: Exception) {
                     null
                 }
                 
                 if (pdfKing != null) {
                     // Run heavy lifting on IO
                     val bitmap = withContext(Dispatchers.IO) {
                         pdfKing.getPageBitmap(pageNo)
                     }
                     val chars = withContext(Dispatchers.IO) {
                         pdfKing.getTextChars(pageNo)
                     }
                     
                     currentBitmap = bitmap
                     currentTextChars = chars
                     
                     pdfPageView.setContent(bitmap, chars)
                 }
             } catch (e: Exception) {
                 e.printStackTrace()
             }
        }
    }

    fun setPage(p: Int) {
        if (pageNo != p) {
            pageNo = p
            render()
        }
    }
    
    fun setPdfWidth(w: Int) {
        viewWidth = w
        // Trigger relayout if needed
    }
    
    fun setPdfHeight(h: Int) {
        viewHeight = h
        // Trigger relayout if needed
    }
    
    fun setHighlights(highlights: List<Map<String, Any>>) {
        val mapped = highlights.mapNotNull { map ->
            val id = map["id"] as? String
            val start = (map["startIndex"] as? Number)?.toInt()
            val end = (map["endIndex"] as? Number)?.toInt()
            
            // Handle color specifically, it might be Double, Int, or Long
            val colorVal = map["color"]
            val color = if (colorVal is Number) {
                colorVal.toInt()
            } else {
                null
            }
            
            if (id != null && start != null && end != null && color != null) {
                com.mobinx.pdfking.Highlight(id, start, end, color)
            } else {
                null
            }
        }
        pdfPageView.preDefinedHighlights = mapped
    }
    
    fun setMode(m: String) {
        if (viewMode != m) {
            viewMode = m
            render()
        }
    }
    
    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        renderJob?.cancel()
        // Optional: clear bitmap to save memory if detached
    }
}
