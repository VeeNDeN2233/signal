package com.example.personnelaccounting.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.personnelaccounting.R
import com.example.personnelaccounting.alarm.AlarmPlayerService
import com.example.personnelaccounting.data.TokenStorage
import com.example.personnelaccounting.offline.AlertResponseQueue
import com.example.personnelaccounting.offline.AlertSyncScheduler
import com.example.personnelaccounting.repo.AlertRepository
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class AlertActivity : AppCompatActivity() {

    private lateinit var acceptButton: MaterialButton
    private lateinit var stopSoundButton: MaterialButton
    private lateinit var alertIdText: android.widget.TextView
    private lateinit var statusText: android.widget.TextView
    private lateinit var errorText: android.widget.TextView
    private lateinit var progress: android.widget.ProgressBar

    private lateinit var tokenStorage: TokenStorage
    private lateinit var repo: AlertRepository
    private lateinit var queue: AlertResponseQueue

    private var alertId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        
        window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        setContentView(R.layout.activity_alert)

        tokenStorage = TokenStorage(this)
        repo = AlertRepository(tokenStorage)
        queue = AlertResponseQueue(this)

        acceptButton = findViewById(R.id.acceptButton)
        stopSoundButton = findViewById(R.id.stopSoundButton)
        alertIdText = findViewById(R.id.alertIdText)
        statusText = findViewById(R.id.statusText)
        errorText = findViewById(R.id.errorText)
        progress = findViewById(R.id.progress)

        alertId = intent.getStringExtra(EXTRA_ALERT_ID)
        alertIdText.text = "ID тревоги: ${alertId ?: "—"}"

        stopSoundButton.setOnClickListener { stopAlarm() }

        acceptButton.setOnClickListener {
            val id = alertId
            if (id.isNullOrBlank()) return@setOnClickListener
            respond(id)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        val newId = intent.getStringExtra(EXTRA_ALERT_ID)
        if (!newId.isNullOrBlank()) {
            alertId = newId
            alertIdText.text = "ID тревоги: $newId"
        }
    }

    private fun respond(id: String) {
        setLoading(true)
        hideError()
        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) { repo.respondToAlert(id) }
            setLoading(false)
            if (result == AlertRepository.RespondResult.Success) {
                stopAlarm()
                showStatus("Отправлено")
                finish()
            } else {
                
                withContext(Dispatchers.IO) { queue.enqueue(id) }
                AlertSyncScheduler.schedule(this@AlertActivity)
                stopAlarm()
                showStatus("Сохранено оффлайн и будет отправлено при появлении сети")
                finish()
            }
        }
    }

    private fun stopAlarm() {
        val stopIntent = Intent(this, AlarmPlayerService::class.java).apply {
            action = AlarmPlayerService.ACTION_STOP
        }
        startService(stopIntent)
    }

    private fun setLoading(loading: Boolean) {
        progress.visibility = if (loading) View.VISIBLE else View.GONE
        acceptButton.isEnabled = !loading
        stopSoundButton.isEnabled = !loading
    }

    private fun showStatus(text: String) {
        statusText.text = text
        statusText.visibility = View.VISIBLE
    }

    private fun hideError() {
        errorText.visibility = View.GONE
        errorText.text = ""
    }

    companion object {
        const val EXTRA_ALERT_ID = "alert_id"
    }
}

