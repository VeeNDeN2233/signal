package com.example.personnelaccounting.offline

import android.content.Context

class AlertResponseQueue(context: Context) {
    private val dao = AppDatabase.get(context).queuedAlertResponseDao()

    suspend fun enqueue(alertId: String) {
        dao.insert(QueuedAlertResponse(alertId = alertId))
    }

    suspend fun all(): List<QueuedAlertResponse> = dao.getAll()

    suspend fun remove(item: QueuedAlertResponse) {
        dao.delete(item)
    }
}

