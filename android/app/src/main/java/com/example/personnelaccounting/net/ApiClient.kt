package com.example.personnelaccounting.net

import com.example.personnelaccounting.BuildConfig
import com.example.personnelaccounting.data.TokenStorage
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

object ApiClient {
    /** Задаётся при сборке: `API_BASE_URL` в `android/local.properties` (см. README). */
    val BASE_URL: String = BuildConfig.API_BASE_URL

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
