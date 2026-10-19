package id.sch.sdnpleburan03.admin.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = PurplePrimary,
    onPrimary = White,
    primaryContainer = PurpleDark,
    onPrimaryContainer = PurpleLight,
    secondary = IndigoAccent,
    onSecondary = White,
    background = SlateDark,
    onBackground = White,
    surface = SlateCard,
    onSurface = White,
    surfaceVariant = SlateCardElevated,
    onSurfaceVariant = SlateTextMuted,
    outline = SlateBorder
)

private val LightColorScheme = lightColorScheme(
    primary = PurplePrimary,
    onPrimary = White,
    primaryContainer = PurpleLight,
    onPrimaryContainer = PurpleDark,
    secondary = IndigoAccent,
    onSecondary = White,
    background = SlateLight,
    onBackground = SlateDark,
    surface = White,
    onSurface = SlateDark,
    surfaceVariant = SlateLight,
    onSurfaceVariant = SlateCard,
    outline = SlateBorder
)

@Composable
fun ComputerPletigTheme(
    darkTheme: Boolean = true, // Default to modern sleek dark theme
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
