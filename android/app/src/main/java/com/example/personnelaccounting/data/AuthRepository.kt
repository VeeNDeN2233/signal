package com.example.personnelaccounting.data

import com.example.personnelaccounting.net.ApiClient
import com.example.personnelaccounting.net.FcmTokenRequest
import com.example.personnelaccounting.net.LoginRequest
import com.google.firebase.messaging.FirebaseMessaging
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class AuthRepository(
    private val tokenStorage: TokenStorage
) {
    private val authApi = ApiClient.createAuthApi(tokenStorage)
    private val employeesApi = ApiClient.createEmployeesApi(tokenStorage)

    fun login(
        login: String,
        password: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        authApi.login(LoginRequest(login = login, password = password))
            .enqueue(object : Callback<com.example.personnelaccounting.net.LoginResponse> {
                override fun onResponse(
                    call: Call<com.example.personnelaccounting.net.LoginResponse>,
                    response: Response<com.example.personnelaccounting.net.LoginResponse>
                ) {
                    if (!response.isSuccessful) {
                        onError(if (response.code() == 401) "Неверный логин или пароль" else "Ошибка сервера (${response.code()})")
                        return
                    }
                    val body = response.body()?.data
                    if (body == null) {
                        onError("Некорректный ответ сервера")
                        return
                    }
                    tokenStorage.setTokens(body.accessToken, body.refreshToken)
                    registerFcmTokenBestEffort()
                    onSuccess()
                }

                override fun onFailure(call: Call<com.example.personnelaccounting.net.LoginResponse>, t: Throwable) {
                    onError("Ошибка сети: ${t.message ?: "неизвестно"}")
                }
            })
    }

    private fun registerFcmTokenBestEffort() {
        FirebaseMessaging.getInstance().token
            .addOnSuccessListener { token ->
                if (token.isNullOrBlank()) return@addOnSuccessListener
                employeesApi.updateFcmToken(FcmTokenRequest(fcm_token = token)).enqueue(object : Callback<Any> {
                    override fun onResponse(call: Call<Any>, response: Response<Any>) = Unit
                    override fun onFailure(call: Call<Any>, t: Throwable) = Unit
                })
            }
            .addOnFailureListener {
                // ignore; we'll retry on next login
            }
    }
}

