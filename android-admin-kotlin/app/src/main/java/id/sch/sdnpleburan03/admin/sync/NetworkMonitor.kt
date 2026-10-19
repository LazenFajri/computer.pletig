package id.sch.sdnpleburan03.admin.sync

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class ConnectionType {
    WIFI,
    CELLULAR,
    OFFLINE
}

data class NetworkState(
    val connectionType: ConnectionType = ConnectionType.OFFLINE,
    val isWifi: Boolean = false,
    val isOnline: Boolean = false
)

class NetworkMonitor(context: Context) {
    private val connectivityManager =
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    private val _networkState = MutableStateFlow(getCurrentNetworkState())
    val networkState: StateFlow<NetworkState> = _networkState.asStateFlow()

    init {
        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()

        connectivityManager.registerNetworkCallback(request, object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                _networkState.value = getCurrentNetworkState()
            }

            override fun onLost(network: Network) {
                _networkState.value = getCurrentNetworkState()
            }

            override fun onCapabilitiesChanged(
                network: Network,
                networkCapabilities: NetworkCapabilities
            ) {
                _networkState.value = getCurrentNetworkState()
            }
        })
    }

    private fun getCurrentNetworkState(): NetworkState {
        val activeNetwork = connectivityManager.activeNetwork ?: return NetworkState(
            connectionType = ConnectionType.OFFLINE,
            isWifi = false,
            isOnline = false
        )

        val capabilities = connectivityManager.getNetworkCapabilities(activeNetwork) ?: return NetworkState(
            connectionType = ConnectionType.OFFLINE,
            isWifi = false,
            isOnline = false
        )

        val hasInternet = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        val isWifi = capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
        val isCellular = capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)

        val type = when {
            !hasInternet -> ConnectionType.OFFLINE
            isWifi -> ConnectionType.WIFI
            isCellular -> ConnectionType.CELLULAR
            else -> ConnectionType.OFFLINE
        }

        return NetworkState(
            connectionType = type,
            isWifi = isWifi,
            isOnline = hasInternet
        )
    }
}
