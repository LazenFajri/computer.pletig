package id.sch.sdnpleburan03.admin

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import id.sch.sdnpleburan03.admin.ui.screens.AdminDashboardScreen
import id.sch.sdnpleburan03.admin.ui.theme.ComputerPletigTheme
import id.sch.sdnpleburan03.admin.ui.theme.SlateDark
import id.sch.sdnpleburan03.admin.ui.viewmodel.AdminDashboardViewModel

class MainActivity : ComponentActivity() {
    private val viewModel: AdminDashboardViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ComputerPletigTheme(darkTheme = true) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = SlateDark
                ) {
                    AdminDashboardScreen(viewModel = viewModel)
                }
            }
        }
    }
}
