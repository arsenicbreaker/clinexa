import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect ke folder (auth)/screen
  return <Redirect href="/(auth)/screen" />;
}
