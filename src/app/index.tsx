import { Redirect } from 'expo-router';

import { useStore } from '@/store';

/**
 * Entry gate. Deep links and cold starts both land here and are routed to the right place:
 * onboarding until it is completed, sign-in until there is a session, then the app itself.
 */
export default function Index() {
  const { session, state } = useStore();

  if (!state.onboardingDone) return <Redirect href="/onboarding" />;
  if (!session) return <Redirect href="/auth/phone" />;
  return <Redirect href="/home" />;
}
