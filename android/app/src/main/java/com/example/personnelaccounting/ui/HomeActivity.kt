package com.example.personnelaccounting.ui

import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.example.personnelaccounting.R
import com.example.personnelaccounting.alarm.AlarmPlayerService
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

        // Кнопки
        findViewById<MaterialButton>(R.id.simulateAlertButton).setOnClickListener {
            val alertId = "debug-${System.currentTimeMillis()}"
            startForegroundService(
                Intent(this, AlarmPlayerService::class.java).apply {
                    action = AlarmPlayerService.ACTION_START
                    putExtra(AlarmPlayerService.EXTRA_ALERT_ID, alertId)
                }
            )
            startActivity(
                Intent(this, AlertActivity::class.java).apply {
                    putExtra(AlertActivity.EXTRA_ALERT_ID, alertId)
                }
            )
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
                val emp = response.body()?.data ?: return

                val lastName  = emp.last_name
                val firstName = emp.first_name
                val middle    = emp.middle_name

                // ФИО: Фамилия И.О.
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

                // Инициалы для аватара
                avatarInitials.text = buildString {
                    append(lastName.first().uppercaseChar())
                    append(firstName.first().uppercaseChar())
                }

                // Звание + должность
                val parts = listOfNotNull(emp.rank_name, emp.position_name)
                rankPosition.text = if (parts.isNotEmpty()) parts.joinToString(", ") else " "

                // Подразделение
                unitName.text = emp.unit_name ?: "—"
            }

            override fun onFailure(call: Call<EmployeeMeResponse>, t: Throwable) {
                loadingIndicator.visibility = View.GONE
                fullName.text = "Нет данных"
            }
        })
    }
}
