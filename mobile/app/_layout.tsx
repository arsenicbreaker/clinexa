import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { useAuth } from '../constants/auth';

// Mencegah splash screen hilang otomatis sebelum kita atur navigasinya
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isLoggedIn } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Sembunyikan splash screen setelah komponen RootLayout siap
    SplashScreen.hideAsync();
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    // Cek apakah user sedang berada di dalam grup folder (auth)
    const inAuthGroup = segments[0] === '(auth)';

    if (!isLoggedIn && !inAuthGroup) {
      // Jika belum login dan tidak berada di halaman auth, paksa pindah ke screen
      router.replace('/(auth)/screen');
    } else if (isLoggedIn && inAuthGroup) {
      // Jika sudah login tapi masih di halaman auth, paksa pindah ke tabs
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, segments, isReady]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}