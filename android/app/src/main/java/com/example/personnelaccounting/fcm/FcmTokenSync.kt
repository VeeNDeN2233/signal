package com.example.personnelaccounting.fcm

import android.util.Log
import com.example.personnelaccounting.data.TokenStorage
import com.example.personnelaccounting.net.ApiClient
import com.example.personnelaccounting.net.FcmTokenRequest
import com.example.personnelaccounting.net.FcmTokenUpdateResponse
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response


object FcmTokenSync {
    private const val TAG = "FcmTokenSync"

    fun registerBestEffort(tokenStorage: TokenStorage, token: String?) {
        if (token.isNullOrBlank()) return
        if (tokenStorage.getAccessToken().isNullOrBlank()) {
            Log.d(TAG, "Пропуск регистрации FCM — нет access-токена")
            return
        }
        val api = ApiClient.createEmployeesApi(tokenStorage)
        api.updateFcmToken(FcmTokenRequest(fcm_token = token)).enqueue(
            object : Callback<FcmTokenUpdateResponse> {
                override fun onResponse(
                    call: Call<FcmTokenUpdateResponse>,
                    response: Response<FcmTokenUpdateResponse>
                ) {
                    if (!response.isSuccessful) {
                        Log.w(
                            TAG,
                            "Регистрация FCM не удалась: HTTP ${response.code()} ${response.errorBody()?.string()}"
                        )
                    }
                }

                override fun onFailure(call: Call<FcmTokenUpdateResponse>, t: Throwable) {
                    Log.e(TAG, "Ошибка сети при регистрации FCM", t)
                }
            }
        )
    }
}
