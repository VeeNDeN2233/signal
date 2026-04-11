package com.example.personnelaccounting.ui

import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.example.personnelaccounting.R
import com.example.personnelaccounting.data.TokenStorage
import com.example.personnelaccounting.net.ApiClient
import com.example.personnelaccounting.net.EmployeeMeResponse
import com.google.android.material.button.MaterialButton
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class HomeActivity : AppCompatActivity() {

    private lateinit var tokenStorage: TokenStorage

    private lateinit var avatarInitials: TextView
    private lateinit var fullName: TextView
    private lateinit var rankPosition: TextView
    private lateinit var unitName: TextView
    private lateinit var roleBadge: TextView
    private lateinit var loadingIndicator: ProgressBar

    private val requestNotifications = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { _ -> }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home)

        tokenStorage = TokenStorage(this)

        avatarInitials  = findViewById(R.id.avatarInitials)
        fullName        = findViewById(R.id.fullName)
        rankPosition    = findViewById(R.id.rankPosition)
        unitName        = findViewById(R.id.unitName)
        roleBadge       = findViewById(R.id.roleBadge)
        loadingIndicator = findViewById(R.id.loadingIndicator)

        // Android 13+ — разрешение на уведомления
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            val granted = ContextCompat.checkSelfPermission(
                this, android.Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) requestNotifications.launch(android.Manifest.permission.POST_NOTIFICATIONS)
        }

        findViewById<MaterialButton>(R.id.logoutButton).setOnClickListener {
            tokenStorage.clear()
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }

        loadEmployeeInfo()
    }

    private fun loadEmployeeInfo() {
        loadingIndicator.visibility = View.VISIBLE

        val employeesApi = ApiClient.createEmployeesApi(tokenStorage)
        employeesApi.getMe().enqueue(object : Callback<EmployeeMeResponse> {
            override fun onResponse(
                call: Call<EmployeeMeResponse>,
                response: Response<EmployeeMeResponse>
            ) {
                loadingIndicator.visibility = View.GONE

                if (!response.isSuccessful) {
                    Log.e("HomeActivity", "Ошибка HTTP ${response.code()}: ${response.errorBody()?.string()}")
                    if (response.code() == 401) {
                        // Токены недействительны — возвращаемся на экран входа
                        tokenStorage.clear()
                        startActivity(Intent(this@HomeActivity, LoginActivity::class.java))
                        finish()
                        return
                    }
                    fullName.text = "Ошибка сервера (${response.code()})"
                    return
                }

                val emp = response.body()?.data
                if (emp == null) {
                    Log.w("HomeActivity", "Данные сотрудника не найдены (data=null). Проверь связь user_id в таблице employees.")
                    fullName.text = "Профиль не найден"
                    avatarInitials.text = "?"
                    rankPosition.text = "Запись сотрудника не привязана к аккаунту"
                    unitName.text = "—"
                    return
                }

                val lastName  = emp.last_name
                val firstName = emp.first_name
                val middle    = emp.middle_name

                val shortName = buildString {
                    append(lastName)
                    append(" ")
                    append(firstName.first().uppercaseChar())
                    append(".")
                    if (!middle.isNullOrBlank()) {
                        append(middle.first().uppercaseChar())
                        append(".")
                    }
                }
                fullName.text = shortName

                avatarInitials.text = buildString {
                    append(lastName.first().uppercaseChar())
                    append(firstName.first().uppercaseChar())
                }

                val parts = listOfNotNull(emp.rank_name, emp.position_name)
                rankPosition.text = if (parts.isNotEmpty()) parts.joinToString(", ") else " "

                unitName.text = emp.unit_name ?: "—"
                Log.d("HomeActivity", "Загружен сотрудник: $shortName, подразделение: ${emp.unit_name}")
            }

            override fun onFailure(call: Call<EmployeeMeResponse>, t: Throwable) {
                loadingIndicator.visibility = View.GONE
                Log.e("HomeActivity", "onFailure при загрузке /api/employees/me: ${t.message}", t)
                fullName.text = "Нет соединения"
            }
        })
    }
}
