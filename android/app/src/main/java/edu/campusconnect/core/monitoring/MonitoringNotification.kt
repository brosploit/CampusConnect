package edu.campusconnect.core.monitoring

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import edu.campusconnect.MainActivity
import edu.campusconnect.R

object MonitoringNotification {
    const val CHANNEL_ID = "cc_monitoring_channel"
    const val NOTIFICATION_ID = 1001
    const val ACTION_STOP_MONITORING = "edu.campusconnect.action.STOP_MONITORING"

    fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                context.getString(R.string.channel_monitoring_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = context.getString(R.string.channel_monitoring_desc)
                setShowBadge(false)
            }
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    fun buildNotification(
        context: Context,
        zoneName: String,
        remainingMinutes: Int
    ): Notification {
        val openAppIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val openAppPendingIntent = PendingIntent.getActivity(
            context,
            0,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = Intent(context, MonitoringService::class.java).apply {
            action = ACTION_STOP_MONITORING
        }
        val stopPendingIntent = PendingIntent.getService(
            context,
            1,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle("Monitoring Active — $zoneName")
            .setContentText("Auto-stops in $remainingMinutes min. Collecting diagnostic connectivity data only.")
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setOngoing(true) // Non-dismissible while active
            .setContentIntent(openAppPendingIntent)
            .addAction(
                android.R.drawable.ic_media_pause,
                context.getString(R.string.action_stop),
                stopPendingIntent
            )
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()
    }
}
