package com.example.personnelaccounting.offline

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "queued_alert_responses")
data class QueuedAlertResponse(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val alertId: String,
    val createdAt: Long = System.currentTimeMillis()
)

