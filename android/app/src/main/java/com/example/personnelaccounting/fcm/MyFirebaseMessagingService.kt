package com.example.personnelaccounting.fcm

import android.content.Intent
import com.example.personnelaccounting.alarm.AlarmPlayerService
import com.example.personnelaccounting.data.TokenStorage
import com.example.personnelaccounting.ui.AlertActivity
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class MyFirebaseMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(message: RemoteMessage) {
        val alertId = message.data["alert_id"] ?: return
        val type = message.data["type"]
        if (type != null && type != "alert") return

        
        val alarmIntent = Intent(this, AlarmPlayerService::class.java).apply {
            action = AlarmPlayerService.ACTION_START
            putExtra(AlarmPlayerService.EXTRA_ALERT_ID, alertId)
        }
        startForegroundService(alarmIntent)

        
        val activityIntent = Intent(this, AlertActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(AlertActivity.EXTRA_ALERT_ID, alertId)
        }
        startActivity(activityIntent)
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        FcmTokenSync.registerBestEffort(TokenStorage(applicationContext), token)
    }
}

