package com.example.personnelaccounting.net

import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PUT

data class FcmTokenRequest(val fcm_token: String)

data class FcmTokenUpdateData(
    val id: Int,
    val user_id: Int,
    val fcm_token: String
)

data class FcmTokenUpdateResponse(val data: FcmTokenUpdateData)

data class EmployeeMeData(
    val id: Int,
    val last_name: String,
    val first_name: String,
    val middle_name: String?,
    val unit_name: String?,
    val position_name: String?,
    val rank_name: String?
)

data class EmployeeMeResponse(val data: EmployeeMeData?)

interface EmployeesApi {
    @GET("/api/employees/me")
    fun getMe(): Call<EmployeeMeResponse>

    @PUT("/api/employees/me/fcm-token")
    fun updateFcmToken(@Body body: FcmTokenRequest): Call<FcmTokenUpdateResponse>
}
