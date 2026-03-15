package expo.modules.rnpdfking

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import com.mobinx.pdfking.PdfKingManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
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
    Events("onPdfLoadSuccess", "onPdfLoadError")

    OnCreate {
      val context = appContext.reactContext
      if (context != null) {
          PdfKingManager.initialize(context)
      }
    }
    
    OnActivityResult { _, payload ->
        if (payload.requestCode == FILE_PICKER_REQUEST_CODE && payload.resultCode == Activity.RESULT_OK) {
            val uri = payload.data?.data
            if (uri != null) {
                handleUriSelection(uri)
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
                     pdfKing.loadPdf(file)
                     val count = pdfKing.getPageCountSync() // Updated to Sync method
                     
                     this@RnPdfKingModule.sendEvent("onPdfLoadSuccess", mapOf(
                        "filePath" to path,
                        "fileName" to file.name,
                        "pageCount" to count
                     ))
                 } catch (e: Exception) {
                     this@RnPdfKingModule.sendEvent("onPdfLoadError", mapOf("message" to (e.message ?: "Unknown error")))
                 }
             }
        } else {
             this@RnPdfKingModule.sendEvent("onPdfLoadError", mapOf("message" to "File does not exist"))
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

      Events("onSelectionChanged", "onSelectionStarted", "onSelectionEnded")
    }
  }

  private fun handleUriSelection(uri: Uri) {
      CoroutineScope(Dispatchers.IO).launch {
          try {
             val context = appContext.reactContext ?: return@launch
             val pdfKing = PdfKingManager.getInstance()
             
             // Resolve name
             var fileName = "unknown.pdf"
             context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (index != -1) fileName = cursor.getString(index)
                }
             }

             // Copy to cache
             val cacheFile = File(context.cacheDir, "temp_${System.currentTimeMillis()}.pdf")
             context.contentResolver.openInputStream(uri)?.use { input ->
                 cacheFile.outputStream().use { output ->
                     input.copyTo(output)
                 }
             }
             
             // Load
             pdfKing.loadPdf(cacheFile)
             val count = pdfKing.getPageCountSync()
             
             this@RnPdfKingModule.sendEvent("onPdfLoadSuccess", mapOf(
                 "filePath" to cacheFile.absolutePath,
                 "fileName" to fileName,
                 "pageCount" to count
             ))
          } catch (e: Exception) {
              e.printStackTrace()
              this@RnPdfKingModule.sendEvent("onPdfLoadError", mapOf("message" to (e.message ?: "Unknown error")))
          }
      }
  }
}
