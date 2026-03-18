package expo.modules.rnpdfking

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import com.mobinx.pdfking.PdfKingManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class RnPdfKingModule : Module() {
  private val FILE_PICKER_REQUEST_CODE = 4242

  override fun definition() = ModuleDefinition {
    Name("RnPdfKing")

    // Events
    Events("onPdfLoadStarted", "onPdfLoadSuccess", "onPdfLoadError")

    OnCreate {
      val context = appContext.reactContext
      if (context != null) {
          PdfKingManager.initialize(context)
          val pdfKing = PdfKingManager.getInstance()
          pdfKing.onFileLoadStarted = {
              this@RnPdfKingModule.sendEvent("onPdfLoadStarted", mapOf())
          }
          pdfKing.onFileLoadSuccess = { filePath, fileName, pageCount ->
              this@RnPdfKingModule.sendEvent("onPdfLoadSuccess", mapOf(
                  "filePath" to filePath,
                  "fileName" to fileName,
                  "pageCount" to pageCount
              ))
          }
          pdfKing.onUnsupportedFile = {
              this@RnPdfKingModule.sendEvent("onPdfLoadError", mapOf("message" to "Unsupported or corrupt PDF file"))
          }
      }
      
      // Check for initial intent
      appContext.currentActivity?.intent?.let { intent ->
          if (intent.action == Intent.ACTION_VIEW) {
              val uri = intent.data
              if (uri != null) {
                  CoroutineScope(Dispatchers.Main).launch {
                      PdfKingManager.getInstance().handleUriSelection(uri)
                  }
              }
          }
      }
    }

    OnNewIntent { intent ->
        if (intent.action == Intent.ACTION_VIEW) {
            val uri = intent.data
            if (uri != null) {
                CoroutineScope(Dispatchers.Main).launch {
                    PdfKingManager.getInstance().handleUriSelection(uri)
                }
            }
        }
    }
    
    AsyncFunction("checkInitialIntent") {
        appContext.currentActivity?.intent?.let { intent ->
            if (intent.action == Intent.ACTION_VIEW) {
                val uri = intent.data
                if (uri != null) {
                    CoroutineScope(Dispatchers.Main).launch {
                        PdfKingManager.getInstance().handleUriSelection(uri)
                    }
                    return@AsyncFunction true
                }
            }
        }
        return@AsyncFunction false
    }

    OnActivityResult { _, payload ->
        if (payload.requestCode == FILE_PICKER_REQUEST_CODE && payload.resultCode == Activity.RESULT_OK) {
            val uri = payload.data?.data
            if (uri != null) {
                CoroutineScope(Dispatchers.Main).launch {
                    PdfKingManager.getInstance().handleUriSelection(uri)
                }
            }
        }
    }

    AsyncFunction("pickFile") {
      val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
          type = "application/pdf"
          addCategory(Intent.CATEGORY_OPENABLE)
      }
      appContext.currentActivity?.startActivityForResult(intent, FILE_PICKER_REQUEST_CODE)
    }
    
    AsyncFunction("loadPdf") { path: String ->
        val file = File(path)
        if (file.exists()) {
             CoroutineScope(Dispatchers.IO).launch {
                 try {
                     val pdfKing = PdfKingManager.getInstance()
                     withContext(Dispatchers.Main) {
                         pdfKing.onFileLoadStarted?.invoke()
                     }
                     pdfKing.loadPdf(file)
                     val count = pdfKing.getPageCountSync()
                     
                     withContext(Dispatchers.Main) {
                         pdfKing.onFileLoadSuccess?.invoke(path, file.name, count)
                     }
                 } catch (e: Exception) {
                     this@RnPdfKingModule.sendEvent("onPdfLoadError", mapOf("message" to (e.message ?: "Unknown error")))
                 }
             }
        } else {
             this@RnPdfKingModule.sendEvent("onPdfLoadError", mapOf("message" to "File does not exist"))
        }
    }

    AsyncFunction("getPageBitmapBase64") { pageNo: Int, promise: Promise ->
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = PdfKingManager.getInstance().getPageBitmapBase64(pageNo)
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("ERR_BITMAP", e.message, e)
            }
        }
    }

    AsyncFunction("getTextChars") { pageNo: Int, promise: Promise ->
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = PdfKingManager.getInstance().getPageText(pageNo)
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("ERR_TEXT", e.message, e)
            }
        }
    }

    View(RnPdfKingView::class) {
      Prop("pageNo") { view: RnPdfKingView, pageNo: Int ->
        view.setPage(pageNo)
      }
      
      Prop("mode") { view: RnPdfKingView, mode: String ->
        view.setMode(mode)
      }
      
      Prop("pdfWidth") { view: RnPdfKingView, width: Int ->
        view.setPdfWidth(width)
      }

      Prop("pdfHeight") { view: RnPdfKingView, height: Int ->
        view.setPdfHeight(height)
      }

      Prop("preDefinedHighlights") { view: RnPdfKingView, highlights: List<Map<String, Any>> ->
        view.setHighlights(highlights)
      }

      Prop("handleColor") { view: RnPdfKingView, color: Int ->
        view.setHandleColor(color)
      }

      Prop("selectionColor") { view: RnPdfKingView, color: Int ->
        view.setSelectionColor(color)
      }

      Prop("selectionEnabled") { view: RnPdfKingView, enabled: Boolean ->
        view.setSelectionEnabled(enabled)
      }

      Events("onSelectionChanged", "onSelectionStarted", "onSelectionEnded", "onPreDefinedHighlightClick")
    }
  }
}
