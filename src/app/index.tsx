import { Image } from 'expo-image';
import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { createStyles, colors } from '@/constants/theme';
import { images } from '@/media';
import { useStore } from '@/store';

/**
 * Entry gate. Deep links and cold starts both land here and are routed to the right place:
 * onboarding until it is completed, sign-in until there is a session, then the app itself.
 *
 * While local state hydrates it shows the brand mark rather than guessing: the hydrate is
 * bounded (@/lib/storage) so this can never become a permanent screen.
 */
export default function Index() {
  const { session, state, ready } = useStore();

  if (!ready) {
    return (
      <View style={styles.splash}>
        {/* The lockup, disc and all: a splash screen is the one place with room for the whole logo. */}
        <Image
          source={images.brandLogo}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="YDU Academy"
        />
      </View>
    );
  }

  if (!state.onboardingDone) return <Redirect href="/onboarding" />;
  if (!session) return <Redirect href="/auth/phone" />;
  return <Redirect href="/home" />;
}

const styles = createStyles(() => StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 184, height: 184 },
}));
