/**
 * Centralized font families for cross-platform typography parity.
 *
 * iOS uses the system-installed Georgia.
 * Android uses Libre Baskerville (loaded via expo-font at app startup),
 * which closely matches Georgia's weight and character widths.
 * Falls back to the generic 'serif' if the custom font hasn't loaded yet.
 */
import { Platform } from 'react-native';

export const SERIF_FONT = Platform.OS === 'ios' ? 'Georgia' : 'LibreBaskerville_400Regular';
export const SERIF_FONT_BOLD = Platform.OS === 'ios' ? 'Georgia' : 'LibreBaskerville_700Bold';
export const SERIF_FONT_ITALIC = Platform.OS === 'ios' ? 'Georgia' : 'LibreBaskerville_400Regular_Italic';

/**
 * Whether custom fonts have been loaded. Set by App.tsx after useFonts() resolves.
 * Components can use this to conditionally render or show a splash.
 */
export let fontsLoaded = false;
export function setFontsLoaded(loaded: boolean): void {
  fontsLoaded = loaded;
}
