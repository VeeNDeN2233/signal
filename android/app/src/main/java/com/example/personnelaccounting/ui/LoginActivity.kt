package com.example.personnelaccounting.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import com.example.personnelaccounting.R
import com.example.personnelaccounting.data.AuthRepository
import com.example.personnelaccounting.data.TokenStorage
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout

class LoginActivity : AppCompatActivity() {

    private lateinit var loginLayout: TextInputLayout
    private lateinit var passwordLayout: TextInputLayout
    private lateinit var loginInput: TextInputEditText
    private lateinit var passwordInput: TextInputEditText
    private lateinit var loginButton: MaterialButton
    private lateinit var errorText: android.widget.TextView
    private lateinit var progress: android.widget.ProgressBar

    private lateinit var tokenStorage: TokenStorage
    private lateinit var authRepository: AuthRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        tokenStorage = TokenStorage(this)
        authRepository = AuthRepository(tokenStorage)

        
        if (tokenStorage.getAccessToken() != null && tokenStorage.getRefreshToken() != null) {
            goHome()
            return
        }

        loginLayout = findViewById(R.id.loginLayout)
        passwordLayout = findViewById(R.id.passwordLayout)
        loginInput = findViewById(R.id.loginInput)
        passwordInput = findViewById(R.id.passwordInput)
        loginButton = findViewById(R.id.loginButton)
        errorText = findViewById(R.id.errorText)
        progress = findViewById(R.id.progress)

        loginButton.setOnClickListener {
            attemptLogin()
        }
    }

    private fun attemptLogin() {
        val login = loginInput.text?.toString()?.trim().orEmpty()
        val password = passwordInput.text?.toString().orEmpty()

        loginLayout.error = null
        passwordLayout.error = null
        errorText.visibility = View.GONE

        var ok = true
        if (login.isBlank()) {
            loginLayout.error = "Введите логин"
            ok = false
        }
        if (password.isBlank()) {
            passwordLayout.error = "Введите пароль"
            ok = false
        }
        if (!ok) return

        setLoading(true)

        authRepository.login(
            login = login,
            password = password,
            onSuccess = {
                runOnUiThread {
                    setLoading(false)
                    goHome()
                }
            },
            onError = { message ->
                runOnUiThread {
                    setLoading(false)
                    errorText.text = message
                    errorText.visibility = View.VISIBLE
                }
            }
        )
    }

    private fun setLoading(isLoading: Boolean) {
        loginButton.isEnabled = !isLoading
        progress.visibility = if (isLoading) View.VISIBLE else View.GONE
    }

    private fun goHome() {
        startActivity(Intent(this, HomeActivity::class.java))
        finish()
    }
}

