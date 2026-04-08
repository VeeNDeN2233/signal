package com.example.personnelaccounting.offline

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.example.personnelaccounting.data.TokenStorage
import com.example.personnelaccounting.repo.AlertRepository

class AlertSyncWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val tokenStorage = TokenStorage(applicationContext)
        val repo = AlertRepository(tokenStorage)
        val queue = AlertResponseQueue(applicationContext)

        val items = queue.all()
        if (items.isEmpty()) return Result.success()

        var anyRetry = false
        for (item in items) {
            val r = repo.respondToAlert(item.alertId)
            if (r == AlertRepository.RespondResult.Success) {
                queue.remove(item)
            } else {
                anyRetry = true
            }
        }

        return if (anyRetry) Result.retry() else Result.success()
    }
}

