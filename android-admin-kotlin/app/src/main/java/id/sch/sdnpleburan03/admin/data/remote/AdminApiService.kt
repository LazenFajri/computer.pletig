package id.sch.sdnpleburan03.admin.data.remote

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface AdminApiService {
    @GET("api/admin/sync")
    suspend fun pullSyncData(): Response<SyncPullResponse>

    @POST("api/admin/sync")
    suspend fun pushSyncData(
        @Body request: SyncPushRequest
    ): Response<SyncPushResponse>
}
