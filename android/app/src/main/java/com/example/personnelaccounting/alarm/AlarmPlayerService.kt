package com.example.personnelaccounting.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import com.example.personnelaccounting.R
import com.example.personnelaccounting.ui.AlertActivity

class AlarmPlayerService : Service() {

    private var ringtone: Ringtone? = null
    private var currentAlertId: String? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var previousAlarmVolume: Int? = null
    private var vibrator: Vibrator? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val alertId = intent.getStringExtra(EXTRA_ALERT_ID) ?: return START_NOT_STICKY
                currentAlertId = alertId
                startAsForeground(alertId)
                acquireWakeLock()
                boostAlarmVolumeBestEffort()
                startVibrationBestEffort()
                startAlarmSound()
            }
            ACTION_STOP -> {
                stopAlarmSoundAndRestore()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
        return START_STICKY
    }

    private fun startAsForeground(alertId: String) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = CHANNEL_ID
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Тревога",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Уведомления тревоги"
                setSound(
                    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                enableVibration(true)
            }
            nm.createNotificationChannel(channel)
        }

        val fullScreenIntent = Intent(this, AlertActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(AlertActivity.EXTRA_ALERT_ID, alertId)
        }
        val fullScreenPending = PendingIntent.getActivity(
            this,
            10,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = Intent(this, AlarmPlayerService::class.java).apply { action = ACTION_STOP }
        val stopPending = PendingIntent.getService(
            this,
            11,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification: Notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("ТРЕВОГА")
            .setContentText("Нажмите, чтобы открыть экран подтверждения")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(fullScreenPending)
            .setFullScreenIntent(fullScreenPending, true)
            .addAction(0, "Отключить звук", stopPending)
            .build()

        startForeground(NOTIFICATION_ID, notification)
    }

    private fun startAlarmSound() {
        if (ringtone?.isPlaying == true) return

        val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
        val rt = RingtoneManager.getRingtone(this, uri)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            rt.audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
            rt.isLooping = true
        }
        ringtone = rt
        rt.play()
    }

    private fun stopAlarmSoundAndRestore() {
        ringtone?.stop()
        ringtone = null
        currentAlertId = null
        stopVibration()
        restoreAlarmVolumeBestEffort()
        releaseWakeLock()
    }

    override fun onDestroy() {
        stopAlarmSoundAndRestore()
        super.onDestroy()
    }

    private fun acquireWakeLock() {
        if (wakeLock?.isHeld == true) return
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "PersonnelAccounting:AlertWakeLock"
        ).apply {
            setReferenceCounted(false)
            acquire(10 * 60 * 1000L)
        }
    }

    private fun releaseWakeLock() {
        wakeLock?.let {
            if (it.isHeld) it.release()
        }
        wakeLock = null
    }

    private fun boostAlarmVolumeBestEffort() {
        val am = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val stream = AudioManager.STREAM_ALARM
        previousAlarmVolume = am.getStreamVolume(stream)
        val max = am.getStreamMaxVolume(stream)
        if (max > 0) {
            am.setStreamVolume(stream, max, 0)
        }
    }

    private fun restoreAlarmVolumeBestEffort() {
        val prev = previousAlarmVolume ?: return
        val am = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        am.setStreamVolume(AudioManager.STREAM_ALARM, prev, 0)
        previousAlarmVolume = null
    }

    private fun startVibrationBestEffort() {
        vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vm = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vm.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }

        val vib = vibrator ?: return
        val pattern = longArrayOf(0, 500, 300, 500, 300, 800)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vib.vibrate(VibrationEffect.createWaveform(pattern, 0))
        } else {
            @Suppress("DEPRECATION")
            vib.vibrate(pattern, 0)
        }
    }

    private fun stopVibration() {
        vibrator?.cancel()
        vibrator = null
    }

    companion object {
        const val ACTION_START = "com.example.personnelaccounting.alarm.START"
        const val ACTION_STOP = "com.example.personnelaccounting.alarm.STOP"
        const val EXTRA_ALERT_ID = "alert_id"

        private const val CHANNEL_ID = "alert_channel"
        private const val NOTIFICATION_ID = 1001
    }
}

