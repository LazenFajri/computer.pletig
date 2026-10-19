package id.sch.sdnpleburan03.admin.data.remote

import android.content.Context
import android.content.SharedPreferences
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    private const val PREFS_NAME = "computer_pletig_admin_prefs"
    private const val KEY_BASE_URL = "backend_base_url"
    
    // Default URL produksi online Vercel (Langsung jalan online tanpa perlu setting manual)
    const val DEFAULT_BASE_URL = "https://computer-pletig.vercel.app/"

    private var currentRetrofit: Retrofit? = null
    private var currentBaseUrl: String = ""

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun getBaseUrl(context: Context): String {
        val saved = getPrefs(context).getString(KEY_BASE_URL, null)
        return if (!saved.isNullOrBlank()) {
            if (saved.endsWith("/")) saved else "$saved/"
        } else {
            DEFAULT_BASE_URL
        }
    }

    fun setBaseUrl(context: Context, newUrl: String) {
        val sanitized = if (newUrl.endsWith("/")) newUrl else "$newUrl/"
        getPrefs(context).edit().putString(KEY_BASE_URL, sanitized).apply()
        currentRetrofit = null // force recreate with new base URL
    }

    fun getService(context: Context): AdminApiService {
        val targetUrl = getBaseUrl(context)
        if (currentRetrofit == null || currentBaseUrl != targetUrl) {
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            val okHttpClient = OkHttpClient.Builder()
                .connectTimeout(8, TimeUnit.SECONDS)
                .readTimeout(10, TimeUnit.SECONDS)
                .writeTimeout(10, TimeUnit.SECONDS)
                .addInterceptor(logging)
                .build()

            currentBaseUrl = targetUrl
            currentRetrofit = Retrofit.Builder()
                .baseUrl(targetUrl)
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
        }

        return currentRetrofit!!.create(AdminApiService::class.java)
    }
}
