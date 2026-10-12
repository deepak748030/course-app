import { useRouter as useExpoRouter, type Href } from 'expo-router';
import { useMemo } from 'react';

/**
 * Double-tap protection for navigation. Every screen in the app navigates through this
 * `useRouter` (not the expo-router one): the first tap on a link, button or back control
 * moves the app, and any further navigation within the window is ignored. Without this, two
 * quick taps stacked the same screen twice.
 */
export const NAV_LOCK_MS = 700;

let lockedUntil = 0;

/** Returns true for the first navigation in the window; false for the taps that follow it. */
export function claimNavigation(): boolean {
  const now = Date.now();
  if (now < lockedUntil) return false;
  lockedUntil = now + NAV_LOCK_MS;
  return true;
}

export function useRouter(): ReturnType<typeof useExpoRouter> {
  const router = useExpoRouter();
  return useMemo(
    () =>
      ({
        ...router,
        push: (href: Href) => {
          if (claimNavigation()) router.push(href);
        },
        replace: (href: Href) => {
          if (claimNavigation()) router.replace(href);
        },
        navigate: (href: Href) => {
          if (claimNavigation()) router.navigate(href);
        },
        back: () => {
          if (claimNavigation()) router.back();
        },
        dismiss: (count?: number) => {
          if (claimNavigation()) router.dismiss(count);
        },
      }) as ReturnType<typeof useExpoRouter>,
    [router],
  );
}
