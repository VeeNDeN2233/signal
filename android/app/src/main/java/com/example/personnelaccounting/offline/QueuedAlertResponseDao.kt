package com.example.personnelaccounting.offline

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query

@Dao
interface QueuedAlertResponseDao {
    @Insert
    suspend fun insert(item: QueuedAlertResponse)

    @Query("SELECT * FROM queued_alert_responses ORDER BY id ASC")
    suspend fun getAll(): List<QueuedAlertResponse>

    @Delete
    suspend fun delete(item: QueuedAlertResponse)
}

