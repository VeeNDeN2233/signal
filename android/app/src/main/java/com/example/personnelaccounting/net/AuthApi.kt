package com.example.personnelaccounting.net

import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.POST

data class LoginRequest(val login: String, val password: String)
data class LoginResponse(val data: LoginData)
data class LoginData(val accessToken: String, val refreshToken: String, val role: String)

data class RefreshRequest(val refreshToken: String)
data class RefreshResponse(
    val accessToken: String? = null,
    val refreshToken: String? = null,
    val data: Any? = null
)

interface AuthApi {
    @POST("/api/auth/login")
    fun login(@Body body: LoginRequest): Call<LoginResponse>

    @POST("/api/auth/refresh")
    fun refresh(@Body body: RefreshRequest): Call<RefreshResponse>

    @POST("/api/alerts/{id}/respond")
    fun respondToAlert(@retrofit2.http.Path("id") alertId: String): Call<Any>
}

