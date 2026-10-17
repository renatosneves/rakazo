package com.rakazo.window

import android.app.Activity
import android.content.ClipData
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.OpenableColumns
import android.view.DragEvent
import android.view.View
import androidx.core.util.Consumer
import androidx.window.java.layout.WindowInfoTrackerCallbackAdapter
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import androidx.window.layout.WindowLayoutInfo
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.util.UUID
import java.util.concurrent.Executor

class RakazoWindowModule : Module() {
  private val mainExecutor = Executor { Handler(Looper.getMainLooper()).post(it) }
  private var attached: Activity? = null
  private var tracker: WindowInfoTrackerCallbackAdapter? = null
  private var posture: Map<String, Any> = flatPosture()

  private val layoutListener = Consumer<WindowLayoutInfo> { info ->
    val activity = attached ?: return@Consumer
    val density = activity.resources.displayMetrics.density
    val fold = info.displayFeatures.filterIsInstance<FoldingFeature>().firstOrNull()
    posture = if (fold == null) {
      flatPosture()
    } else {
      mapOf(
        "tabletop" to (
          fold.state == FoldingFeature.State.HALF_OPENED &&
            fold.orientation == FoldingFeature.Orientation.HORIZONTAL
          ),
        "hingeTop" to (fold.bounds.top / density).toDouble(),
        "hingeBottom" to (fold.bounds.bottom / density).toDouble(),
      )
    }
    sendEvent("onPostureChange", posture)
  }

  private val dragListener = View.OnDragListener { _, event -> onDrag(event) }

  override fun definition() = ModuleDefinition {
    Name("RakazoWindow")

    Events("onPostureChange", "onFilesDropped", "onTextDropped")

    Function("getPosture") { posture }

    OnCreate { mainExecutor.execute { attach() } }
    OnActivityEntersForeground { attach() }
    OnActivityDestroys { detach() }
    OnDestroy { mainExecutor.execute { detach() } }
  }

  private fun attach() {
    val activity = appContext.currentActivity ?: return
    if (activity === attached) return
    detach()
    attached = activity
    activity.window?.decorView?.setOnDragListener(dragListener)
    val adapter = WindowInfoTrackerCallbackAdapter(WindowInfoTracker.getOrCreate(activity))
    adapter.addWindowLayoutInfoListener(activity, mainExecutor, layoutListener)
    tracker = adapter
  }

  private fun detach() {
    tracker?.removeWindowLayoutInfoListener(layoutListener)
    tracker = null
    attached?.window?.decorView?.setOnDragListener(null)
    attached = null
  }

  private fun onDrag(event: DragEvent): Boolean {
    return when (event.action) {
      DragEvent.ACTION_DRAG_STARTED -> (event.clipDescription?.mimeTypeCount ?: 0) > 0
      DragEvent.ACTION_DROP -> drop(event)
      else -> true
    }
  }

  private fun drop(event: DragEvent): Boolean {
    val activity = attached ?: return false
    val clip = event.clipData ?: return false
    val uris = mutableListOf<Uri>()
    val texts = mutableListOf<String>()
    for (index in 0 until clip.itemCount) {
      val item: ClipData.Item = clip.getItemAt(index)
      val uri = item.uri
      if (uri != null) {
        uris.add(uri)
      } else {
        val text = item.text?.toString()
        if (!text.isNullOrBlank()) texts.add(text)
      }
    }
    if (texts.isNotEmpty()) {
      sendEvent("onTextDropped", mapOf("text" to texts.joinToString("\n")))
    }
    if (uris.isNotEmpty()) {
      // The read grant for another app's content lasts until it is released.
      val permissions = activity.requestDragAndDropPermissions(event)
      Thread {
        val files = uris.mapNotNull { copyToCache(activity, it) }
        permissions?.release()
        if (files.isNotEmpty()) sendEvent("onFilesDropped", mapOf("files" to files))
      }.start()
    }
    return uris.isNotEmpty() || texts.isNotEmpty()
  }

  private fun copyToCache(activity: Activity, uri: Uri): Map<String, Any>? {
    return runCatching {
      val resolver = activity.contentResolver
      var name: String? = null
      resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
        if (cursor.moveToFirst() && !cursor.isNull(0)) name = cursor.getString(0)
      }
      val displayName = name?.substringAfterLast('/')?.takeIf { it.isNotBlank() } ?: "file"
      val directory = File(activity.cacheDir, "dropped/${UUID.randomUUID()}")
      directory.mkdirs()
      val target = File(directory, displayName)
      val input = resolver.openInputStream(uri) ?: return@runCatching null
      input.use { source -> target.outputStream().use { sink -> source.copyTo(sink) } }
      mapOf(
        "uri" to Uri.fromFile(target).toString(),
        "name" to displayName,
        "mimeType" to (resolver.getType(uri) ?: "application/octet-stream"),
        "size" to target.length().toDouble(),
      )
    }.getOrNull()
  }

  private fun flatPosture(): Map<String, Any> =
    mapOf("tabletop" to false, "hingeTop" to 0.0, "hingeBottom" to 0.0)
}
