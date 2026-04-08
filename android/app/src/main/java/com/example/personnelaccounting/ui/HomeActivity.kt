package com.example.personnelaccounting.ui

import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.example.personnelaccounting.R
import com.example.personnelaccounting.alarm.AlarmPlayerService
import com.example.personnelaccounting.data.TokenStorage
import com.google.android.material.button.MaterialButton

class HomeActivity : AppCompatActivity() {
    private lateinit var tokenStorage: TokenStorage

    private val requestNotifications = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { _ -> }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home)

        tokenStorage = TokenStorage(this)

        // Android 13+ notification permission (needed for foreground alert notification UX)
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            val granted = ContextCompat.checkSelfPermission(
                this,
                android.Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) {
                requestNotifications.launch(android.Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        findViewById<MaterialButton>(R.id.simulateAlertButton).setOnClickListener {
            val alertId = "debug-${System.currentTimeMillis()}"

            val alarmIntent = Intent(this, AlarmPlayerService::class.java).apply {
                action = AlarmPlayerService.ACTION_START
                putExtra(AlarmPlayerService.EXTRA_ALERT_ID, alertId)
            }
            startForegroundService(alarmIntent)

            val activityIntent = Intent(this, AlertActivity::class.java).apply {
                putExtra(AlertActivity.EXTRA_ALERT_ID, alertId)
            }
            startActivity(activityIntent)
        }

        findViewById<MaterialButton>(R.id.logoutButton).setOnClickListener {
            tokenStorage.clear()
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }
    }
}

