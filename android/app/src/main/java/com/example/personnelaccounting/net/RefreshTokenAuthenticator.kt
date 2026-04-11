package com.example.personnelaccounting.net

import android.util.Log
import com.example.personnelaccounting.data.TokenStorage
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

class RefreshTokenAuthenticator(
    private val tokenStorage: TokenStorage
) : Authenticator {

    override fun authenticate(route: Route?, response: Response): Request? {
        if (responseCount(response) >= 2) return null

        val refresh = tokenStorage.getRefreshToken()
        if (refresh.isNullOrBlank()) {
            Log.w("RefreshAuth", "Нет refresh-токена — нужна повторная авторизация")
            return null
        }

        if (response.request.url.encodedPath.endsWith("/api/auth/refresh")) return null

        Log.d("RefreshAuth", "Access-токен истёк, пробуем обновить...")
        val newTokens = runCatching { refreshBlocking(refresh) }
            .onFailure { Log.e("RefreshAuth", "Исключение при обновлении токена: ${it.message}", it) }
            .getOrNull()

        if (newTokens == null) {
            Log.w("RefreshAuth", "Не удалось обновить токен — очищаем сессию")
            tokenStorage.clear()
            return null
        }

        Log.d("RefreshAuth", "Токен успешно обновлён")
        tokenStorage.setTokens(newTokens.accessToken, newTokens.refreshToken)

        return response.request.newBuilder()
            .header("Authorization", "Bearer ${newTokens.accessToken}")
            .build()
    }

    private data class Tokens(val accessToken: String, val refreshToken: String)

    private fun refreshBlocking(refreshToken: String): Tokens? {
        val moshi = Moshi.Builder()
            .add(KotlinJsonAdapterFactory())
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl(ApiClient.BASE_URL)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()

        val api = retrofit.create(AuthApi::class.java)
        val res = api.refresh(RefreshRequest(refreshToken)).execute()
        Log.d("RefreshAuth", "Ответ /api/auth/refresh: ${res.code()}")
        if (!res.isSuccessful) return null
        val body = res.body() ?: return null
        val access = body.accessToken ?: return null
        val newRefresh = body.refreshToken ?: return null
        return Tokens(access, newRefresh)
    }

    private fun responseCount(response: Response): Int {
        var r: Response? = response
        var result = 1
        while (r?.priorResponse != null) {
            result++
            r = r.priorResponse
        }
        return result
    }
}

