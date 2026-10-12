import Constants from 'expo-constants';

/** The version this build was made from (the `version` in app.json). */
export function appVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

/** -1, 0 or 1 for dotted numeric versions ("1.2.0"). Missing parts count as 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((part) => parseInt(part, 10) || 0);
  const pb = b.split('.').map((part) => parseInt(part, 10) || 0);
  const length = Math.max(pa.length, pb.length);
  for (let i = 0; i < length; i += 1) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/** True when this build is older than the admin's minimum. An empty minimum means no gate. */
export function isBelowMinimum(current: string, minimum: string | null | undefined): boolean {
  const required = (minimum ?? '').trim();
  if (!required) return false;
  return compareVersions(current, required) < 0;
}
