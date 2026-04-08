package com.example.personnelaccounting.net

import com.example.personnelaccounting.data.TokenStorage
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
        // Avoid infinite loop
        if (responseCount(response) >= 2) return null

        val refresh = tokenStorage.getRefreshToken() ?: return null

        // Refresh endpoint itself should not trigger refresh recursion
        if (response.request.url.encodedPath.endsWith("/api/auth/refresh")) return null

        val newTokens = runCatching { refreshBlocking(refresh) }.getOrNull() ?: return null

        tokenStorage.setTokens(newTokens.accessToken, newTokens.refreshToken)

        return response.request.newBuilder()
            .header("Authorization", "Bearer ${newTokens.accessToken}")
            .build()
    }

    private data class Tokens(val accessToken: String, val refreshToken: String)

    private fun refreshBlocking(refreshToken: String): Tokens? {
        val retrofit = Retrofit.Builder()
            .baseUrl("http://10.0.2.2:3000/")
            .addConverterFactory(MoshiConverterFactory.create())
            .build()

        val api = retrofit.create(AuthApi::class.java)
        val call = api.refresh(RefreshRequest(refreshToken))
        val res = call.execute()
        if (!res.isSuccessful) return null
        val body = res.body() ?: return null
        val access = body.accessToken ?: return null
        val refresh = body.refreshToken ?: return null
        return Tokens(access, refresh)
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

