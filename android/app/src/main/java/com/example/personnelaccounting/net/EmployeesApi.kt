package com.example.personnelaccounting.net

import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.PUT

data class FcmTokenRequest(val fcm_token: String)

interface EmployeesApi {
    @PUT("/api/employees/me/fcm-token")
    fun updateFcmToken(@Body body: FcmTokenRequest): Call<Any>
}

