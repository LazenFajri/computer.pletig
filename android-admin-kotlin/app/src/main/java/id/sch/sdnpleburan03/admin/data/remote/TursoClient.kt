package id.sch.sdnpleburan03.admin.data.remote

import android.content.Context
import android.util.Log
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

/**
 * TursoClient: Klien langsung ke Database Cloud Turso (libSQL on AWS Tokyo).
 * Memungkinkan aplikasi Android membaca & menulis data secara real-time ke Turso.
 */
object TursoClient {
    private const val TAG = "TursoClient"
    private const val PREFS_NAME = "computer_pletig_turso_prefs"
    private const val KEY_TURSO_URL = "turso_database_url"
    private const val KEY_TURSO_TOKEN = "turso_auth_token"

    // Default Turso Cloud Database URL (AWS Tokyo) & Auth Token JWT
    const val DEFAULT_TURSO_URL = "https://computerpletig-lazenfajri.aws-ap-northeast-1.turso.io/v2/pipeline"
    const val DEFAULT_TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTIxMzMwNDIsImlkIjoiMDFhMTQzNzMtZWQwMS03OWI2LWEyZDQtYjc1MjlmOGJiMzVhIiwia2lkIjoiSU9BX3BCd3IyRF9IRlYyTFlReFV3MXNRZFh2LTJ2SGZ5ZGVsWWdwc2xRVSIsInJpZCI6IjJiYWRmNjJkLTMwZGMtNGVhOS05ZTE0LTNkOTBhYjI0ZDgwMiJ9.eEVnU2YgpZ6coZOvUEjw881IjlyT5IhtZfqbgAuL0yDG7KtzswWj_4jOWHAJQLxZY2U-SkWBpQm0gqDGofIeDA"

    private val httpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(6, TimeUnit.SECONDS)
            .readTimeout(8, TimeUnit.SECONDS)
            .writeTimeout(8, TimeUnit.SECONDS)
            .build()
    }

    private val gson = Gson()

    fun getTursoUrl(context: Context): String {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_TURSO_URL, DEFAULT_TURSO_URL) ?: DEFAULT_TURSO_URL
    }

    fun getTursoToken(context: Context): String {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_TURSO_TOKEN, DEFAULT_TURSO_TOKEN) ?: DEFAULT_TURSO_TOKEN
    }

    fun saveConfig(context: Context, url: String, token: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_TURSO_URL, url.trim())
            .putString(KEY_TURSO_TOKEN, token.trim())
            .apply()
    }

    /**
     * Test direct connection & latency to Turso Database
     * Returns Pair(isSuccess, latencyMs)
     */
    suspend fun pingTurso(context: Context): Pair<Boolean, Long> = withContext(Dispatchers.IO) {
        val start = System.currentTimeMillis()
        try {
            val url = getTursoUrl(context)
            val token = getTursoToken(context)

            val payload = mapOf(
                "requests" to listOf(
                    mapOf(
                        "type" to "execute",
                        "stmt" to mapOf("sql" to "SELECT 1")
                    )
                )
            )

            val jsonBody = gson.toJson(payload).toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url(url)
                .header("Authorization", "Bearer $token")
                .header("Content-Type", "application/json")
                .post(jsonBody)
                .build()

            val response = httpClient.newCall(request).execute()
            val latency = System.currentTimeMillis() - start
            val success = response.isSuccessful
            response.close()
            Pair(success, latency)
        } catch (e: Exception) {
            Log.e(TAG, "Ping to Turso failed: ${e.message}")
            Pair(false, System.currentTimeMillis() - start)
        }
    }

    /**
     * Execute SQL mutation statement directly on Turso
     */
    suspend fun executeSql(context: Context, sql: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val url = getTursoUrl(context)
            val token = getTursoToken(context)

            val payload = mapOf(
                "requests" to listOf(
                    mapOf(
                        "type" to "execute",
                        "stmt" to mapOf("sql" to sql)
                    )
                )
            )

            val jsonBody = gson.toJson(payload).toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url(url)
                .header("Authorization", "Bearer $token")
                .header("Content-Type", "application/json")
                .post(jsonBody)
                .build()

            val response = httpClient.newCall(request).execute()
            val success = response.isSuccessful
            response.close()
            success
        } catch (e: Exception) {
            Log.e(TAG, "executeSql on Turso failed: ${e.message}")
            false
        }
    }
}
