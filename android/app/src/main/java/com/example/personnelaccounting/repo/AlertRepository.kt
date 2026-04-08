package com.example.personnelaccounting.repo

import com.example.personnelaccounting.data.TokenStorage
import com.example.personnelaccounting.net.ApiClient
import java.io.IOException

class AlertRepository(tokenStorage: TokenStorage) {
    private val authApi = ApiClient.createAuthApi(tokenStorage)

    enum class RespondResult {
        Success,
        RetryLater
    }

    fun respondToAlert(alertId: String): RespondResult {
        return try {
            val response = authApi.respondToAlert(alertId).execute()
            if (response.isSuccessful || response.code() == 409) {
                RespondResult.Success
            } else {
                RespondResult.RetryLater
            }
        } catch (_: IOException) {
            RespondResult.RetryLater
        } catch (_: Exception) {
            RespondResult.RetryLater
        }
    }
}

