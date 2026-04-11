package com.example.personnelaccounting.net

import com.example.personnelaccounting.data.TokenStorage
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

object ApiClient {
    // Эмулятор Android: 10.0.2.2 (localhost хоста)
    // Реальный телефон: IP компьютера в локальной сети, например http://192.168.1.XXX:3000/
    const val BASE_URL = "http://10.0.2.2:3000/"

    private fun createHttpClient(tokenStorage: TokenStorage): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }

        return OkHttpClient.Builder()
            .addInterceptor(AuthHeaderInterceptor(tokenStorage))
            .authenticator(RefreshTokenAuthenticator(tokenStorage))
            .addInterceptor(logging)
            .build()
    }

    private fun createRetrofit(tokenStorage: TokenStorage): Retrofit {
        val moshi = Moshi.Builder()
            .add(KotlinJsonAdapterFactory())
            .build()

        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(createHttpClient(tokenStorage))
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
    }

    fun createAuthApi(tokenStorage: TokenStorage): AuthApi =
        createRetrofit(tokenStorage).create(AuthApi::class.java)

    fun createEmployeesApi(tokenStorage: TokenStorage): EmployeesApi =
        createRetrofit(tokenStorage).create(EmployeesApi::class.java)
}
