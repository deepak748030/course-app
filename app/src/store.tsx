/**
 * App state: one context, local persistence, server-synced account data.
 *
 * Device preferences (onboarding done, interests, notification settings, theme, language)
 * live in AsyncStorage. Account data — enrollments and lesson progress — hydrates from the
 * YDU Academy server when a session exists, and every change is pushed back up (debounced,
 * fire-and-forget) so learning state follows the account across devices. The session token
 * lives in the auth service, which uses the platform secure store.
 */

import { AppState } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { DEFAULT_THEME, isThemeId, setActiveTheme, type ThemeId } from '@/constants/theme';
import { DEFAULT_LANGUAGE, isLanguage, setActiveLanguage, type Language } from '@/i18n';
import { storage } from '@/lib/storage';
import { api, setAccountBlockedHandler, setSessionExpiredHandler, type ServerSettings } from '@/services/api';
import { authService } from '@/services/auth';
import { connectRealtime, disconnectRealtime, onAccountBlocked, onEnrollmentGranted, onSettingsUpdated } from '@/services/realtime';
import { forgetPushToken, syncPushToken, watchPushTokenChanges } from '@/services/push';
import type {
  Course,
  Enrollment,
  Id,
  Lesson,
  CourseRating,
  LessonProgress,
  NotificationPrefs,
  Session,
  UserProfile,
} from '@/types';

const STORAGE_KEY = 'ydu.state.v1';

type PersistedState = {
  onboardingDone: boolean;
  /** courseId -> the rating the learner gave it. Kept locally for instant UI; also posted to the server. */
  ratings: Record<Id, CourseRating>;
  interests: string[];
  savedCourseIds: Id[];
  savedRecipeIds: Id[];
  enrollments: Record<Id, Enrollment>;
  /** courseId -> lessonId -> progress */
  progress: Record<Id, Record<Id, LessonProgress>>;
  notes: Record<Id, string>;
  notificationsRead: boolean;
  /** Unread messages in the inbox, as last counted by the server. */
  notificationsUnread: number;
  /** When the learner last opened the inbox; messages after this are unread. */
  notificationsSeenAt?: string;
  preferences: NotificationPrefs;
  /**
   * Profile photo chosen on this device, as a data URI (web) or a local file URI (native).
   * Kept locally for instant display; also uploaded to the server when signed in.
   */
  profileAvatarUri: string | null;
  /**
   * Chosen look. A device preference rather than account data, so it survives sign-out.
   *
   * `themeChosen` records that the learner picked a theme themselves. Without it a stored `theme`
   * cannot be told apart from the default of an older build, and changing the default would never
   * reach an install that already has the old one written down.
   */
  theme: ThemeId;
  themeChosen: boolean;
  /**
   * Chosen interface language. Also a device preference: a learner who switched to Hindi should not be
   * flipped back to English by signing out.
   */
  language: Language;
};

/** Fresh installs start empty: account data arrives from the server after sign-in. */
function seedState(): PersistedState {
  return {
    onboardingDone: false,
    ratings: {},
    interests: [],
    savedCourseIds: [],
    savedRecipeIds: [],
    enrollments: {},
    progress: {},
    notes: {},
    notificationsRead: false,
    notificationsUnread: 0,
    preferences: { courseUpdates: true, learningReminders: true, productNews: false },
    profileAvatarUri: null,
    theme: DEFAULT_THEME,
    themeChosen: false,
    language: DEFAULT_LANGUAGE,
  };
}

/**
 * Reads a stored blob and keeps only what this build understands, so a value written by an older
 * or newer version can never break a screen (an unknown theme id falls back to the default).
 */
function restoreState(raw: string): PersistedState | null {
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const merged: PersistedState = { ...seedState(), ...parsed };
    // The theme and the language are applied before the first painted frame of the restored state.
    merged.theme = merged.themeChosen === true && isThemeId(merged.theme) ? merged.theme : DEFAULT_THEME;
    merged.themeChosen = merged.themeChosen === true;
    merged.language = isLanguage(merged.language) ? merged.language : DEFAULT_LANGUAGE;
    return merged;
  } catch {
    return null;
  }
}

type StoreValue = {
  ready: boolean;
  session: Session | null;
  state: PersistedState;
  /** App-wide settings from the server (maintenance mode, support details), live-updated. */
  settings: ServerSettings | null;
  /** Fetches the settings again now (the maintenance and update screens' "check again"). */
  reloadSettings: () => Promise<ServerSettings | null>;

  signIn: (session: Session) => void;
  signOut: () => Promise<void>;
  /** Merges profile edits into the session, persists them and syncs them to the server. */
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  /** Sets the local avatar and — when signed in — uploads it to the server. */
  setProfileAvatar: (uri: string | null) => void;
  /** Applies a theme immediately (whole tree) and remembers it for the next launch. */
  setTheme: (id: ThemeId) => void;
  /** Switches the whole interface to another language, immediately, and remembers the choice. */
  setLanguage: (id: Language) => void;
  completeOnboarding: () => void;

  toggleInterest: (id: string) => void;
  /** Adopts the interests saved on the account, unless this device already has its own choice. */
  restoreInterests: (ids: string[]) => void;
  isInterestSelected: (id: string) => boolean;

  toggleSavedCourse: (id: Id) => void;
  toggleSavedRecipe: (id: Id) => void;
  isCourseSaved: (id: Id) => boolean;
  isRecipeSaved: (id: Id) => boolean;

  isEnrolled: (courseId: Id) => boolean;
  addEnrollment: (enrollment: Enrollment) => void;
  /** Pulls enrollments + lesson progress from the server into local state. */
  hydrateLearning: () => Promise<void>;

  lessonProgress: (courseId: Id, lessonId: Id) => LessonProgress;
  completedCount: (course: Course) => number;
  courseProgressRatio: (course: Course) => number;
  resumeLesson: (course: Course) => { lesson: Lesson; positionSec: number } | null;
  setLessonComplete: (course: Course, lessonId: Id, complete: boolean) => void;
  setLessonPosition: (course: Course, lessonId: Id, positionSec: number) => void;

  noteFor: (lessonId: Id) => string;
  setNote: (lessonId: Id, text: string) => void;

  ratingFor: (courseId: Id) => CourseRating | null;
  /** Writes (or overwrites) the learner's rating for a course. */
  setRating: (rating: CourseRating) => void;

  setPreference: (key: keyof NotificationPrefs, value: boolean) => void;
  markNotificationsRead: () => void;
  setNotificationsUnread: (count: number) => void;
  /** Clears this device's cached learning data. Signed-in learners get their purchases and progress back from the server. */
  resetDeviceData: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

/** Collects the server representation of a course's progress for the sync call. */
function progressPayload(courseId: Id, lessonMap: Record<Id, LessonProgress>) {
  const entries = Object.entries(lessonMap);
  const completedLessons = entries.filter(([, v]) => v.completed).map(([lessonId]) => lessonId);
  const inProgress = entries
    .filter(([, v]) => !v.completed && v.positionSec > 0)
    .sort((a, b) => b[1].positionSec - a[1].positionSec)[0];
  return {
    completedLessons,
    lastLessonId: inProgress?.[0] ?? completedLessons[completedLessons.length - 1] ?? '',
    lastPositionSeconds: inProgress?.[1].positionSec ?? 0,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(seedState);
  const [session, setSession] = useState<Session | null>(null);
  const [settings, setSettings] = useState<ServerSettings | null>(null);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  // Latest state in a ref so debounced syncs never read a stale closure.
  const stateRef = useRef(state);
  stateRef.current = state;
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const syncTimers = useRef(new Map<Id, ReturnType<typeof setTimeout>>());

  /** Push one course's progress to the server (fire-and-forget). */
  const syncProgress = useCallback((courseId: Id, courseRemoteId: Id) => {
    if (!sessionRef.current) return;
    const lessonMap = stateRef.current.progress[courseId];
    if (!lessonMap) return;
    api.saveProgress(courseRemoteId, progressPayload(courseId, lessonMap)).catch(() => {
      // Offline edits stay on-device and re-sync the next time a save lands.
    });
  }, []);

  const scheduleProgressSync = useCallback(
    (course: Course) => {
      const pending = syncTimers.current.get(course.id);
      if (pending) clearTimeout(pending);
      syncTimers.current.set(
        course.id,
        setTimeout(() => {
          syncTimers.current.delete(course.id);
          syncProgress(course.id, course.remoteId);
        }, 1200),
      );
    },
    [syncProgress],
  );

  /** Pulls account learning data from the server and merges it into local state. */
  const hydrateLearning = useCallback(async () => {
    if (!sessionRef.current) return;
    try {
      const { enrollments } = await api.myEnrollments();
      const enrollmentMap: Record<Id, Enrollment> = {};
      const progressMap: Record<Id, Record<Id, LessonProgress>> = {};

      for (const entry of enrollments) {
        if (!entry.course) continue;
        const courseId = entry.course.slug;
        enrollmentMap[courseId] = {
          courseId,
          purchasedAt: entry.createdAt,
          priceInr: entry.course.priceInr,
          source: 'server',
        };
        const lessons: Record<Id, LessonProgress> = {};
        for (const lessonId of entry.completedLessons) {
          lessons[lessonId] = { completed: true, positionSec: 0 };
        }
        if (entry.lastLessonId) {
          const existing = lessons[entry.lastLessonId];
          lessons[entry.lastLessonId] = {
            completed: existing?.completed ?? false,
            positionSec: entry.lastPositionSeconds,
          };
        }
        progressMap[courseId] = lessons;
      }

      setState((prev) => ({
        ...prev,
        enrollments: { ...prev.enrollments, ...enrollmentMap },
        progress: { ...prev.progress, ...progressMap },
      }));
    } catch {
      // Server unreachable — the app keeps working with whatever is on-device.
    }
  }, []);

  /** Loads app settings once and keeps them fresh through the realtime channel. */
  useEffect(() => {
    api
      .settings()
      .then(({ settings: next }) => setSettings(next))
      .catch(() => {});
    return onSettingsUpdated((payload) => {
      if (payload.settings) setSettings(payload.settings as ServerSettings);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Every storage call is already bounded and never rejects (see @/lib/storage), and the
      // boot gate is released no matter what happens here — a locked-down browser must not
      // leave the app on a blank screen.
      let raw: string | null = null;
      let storedSession: Session | null = null;
      try {
        [raw, storedSession] = await Promise.all([storage.get(STORAGE_KEY), authService.getSession()]);
      } catch {
        // Storage is unavailable; continue with a fresh state.
      }
      if (cancelled) return;
      const restored = raw ? restoreState(raw) : null;
      if (restored) {
        // The theme and the language are applied before the first painted frame of the restored state.
        setActiveTheme(restored.theme);
        setActiveLanguage(restored.language);
        setState(restored);
      }
      setSession(storedSession);
      hydrated.current = true;
      setReady(true);
    })().catch(() => {
      if (!cancelled) {
        hydrated.current = true;
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Ends the local account: realtime, stored session and learning data. Shared by sign-out and by
  // a blocked account, so neither leaves the account's data on the device.
  const endAccountSession = useCallback(async () => {
    // While the session still exists: remove this phone from the account, so it gets no more of its pushes.
    await forgetPushToken();
    disconnectRealtime();
    await authService.clearSession();
    setSession(null);
    // Learning data belongs to the account, so it goes with the session.
    setState((prev) => ({
      ...seedState(),
      onboardingDone: true,
      interests: prev.interests,
      preferences: prev.preferences,
      // The look and the language belong to the device, not to the account.
      theme: prev.theme,
      language: prev.language,
    }));
  }, []);

  // A blocked account is signed out at once, even while the app is open: the server pushes the
  // news on the realtime socket, and every request it rejects with 403 ends the session too.
  useEffect(() => {
    setAccountBlockedHandler(() => {
      void endAccountSession();
    });
    const unsubscribe = onAccountBlocked(() => {
      void endAccountSession();
    });
    return () => {
      setAccountBlockedHandler(null);
      unsubscribe();
    };
  }, [endAccountSession]);

  // Coming back to the app re-checks the account, so a block made while it was in the background
  // takes effect without waiting for the next screen to load data.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active' && sessionRef.current) {
        void api.me().catch(() => {});
        void syncPushToken();
      }
    });
    return () => subscription.remove();
  }, []);

  // A token the server no longer accepts ends the local session, so the user signs in again
  // instead of hitting the same 401 on every payment or lesson request.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      void authService.clearSession();
      setSession(null);
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  // Session lifecycle: realtime socket + server hydration follow sign-in/sign-out.
  useEffect(() => {
    connectRealtime(session?.token ?? null);
    if (session) void hydrateLearning();
    return () => {
      if (!session) disconnectRealtime();
    };
  }, [session?.token, hydrateLearning]); // eslint-disable-line react-hooks/exhaustive-deps

  // Push: this phone is registered for the signed-in learner, and kept current when the OS rotates its token.
  useEffect(() => {
    if (!session) return;
    void syncPushToken();
    return watchPushTokenChanges(() => void syncPushToken());
  }, [session?.token]); // eslint-disable-line react-hooks/exhaustive-deps

  // An enrollment granted somewhere else (e.g. admin marks an order paid) refreshes access here.
  useEffect(
    () =>
      onEnrollmentGranted(() => {
        void hydrateLearning();
      }),
    [hydrateLearning],
  );

  useEffect(() => {
    if (!hydrated.current) return;
    void storage.set(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const patchProgress = useCallback(
    (courseId: Id, lessonId: Id, patch: Partial<LessonProgress>) => {
      setState((prev) => {
        const course = prev.progress[courseId] ?? {};
        const current = course[lessonId] ?? { completed: false, positionSec: 0 };
        return {
          ...prev,
          progress: { ...prev.progress, [courseId]: { ...course, [lessonId]: { ...current, ...patch } } },
        };
      });
    },
    [],
  );

  const reloadSettings = useCallback(async (): Promise<ServerSettings | null> => {
    try {
      const { settings: next } = await api.settings();
      setSettings(next);
      return next;
    } catch {
      // Offline or the server is down: keep the last known settings.
      return null;
    }
  }, []);

  // Stable identities. Effects depend on these, and the store value is rebuilt on every state change:
  // a new function here would re-run those effects, which change state again, in a loop. A call that
  // changes nothing returns the previous state, so React does not re-render at all.
  const markNotificationsRead = useCallback(
    () =>
      setState((prev) =>
        prev.notificationsRead && prev.notificationsUnread === 0
          ? prev
          : { ...prev, notificationsRead: true, notificationsUnread: 0, notificationsSeenAt: new Date().toISOString() },
      ),
    [],
  );
  const setNotificationsUnread = useCallback(
    (count: number) =>
      setState((prev) =>
        prev.notificationsUnread === count && prev.notificationsRead === (count === 0)
          ? prev
          : { ...prev, notificationsUnread: count, notificationsRead: count === 0 },
      ),
    [],
  );

  const value = useMemo<StoreValue>(() => {
    const lessonProgress = (courseId: Id, lessonId: Id) =>
      state.progress[courseId]?.[lessonId] ?? { completed: false, positionSec: 0 };

    return {
      ready,
      session,
      state,
      settings,
      reloadSettings,

      signIn: (next) => setSession(next),
      updateProfile: async (patch) => {
        const current = session;
        if (!current) return;
        const nextSession: Session = { ...current, profile: { ...current.profile, ...patch } };
        setSession(nextSession);
        await authService.saveSession(nextSession);
        // Best effort: the server copy follows the local edit.
        api.updateMe(patch).then(({ user }) => {
          setSession((prev) =>
            prev
              ? {
                  ...prev,
                  profile: {
                    ...prev.profile,
                    avatarUrl: user.avatarUrl || prev.profile.avatarUrl,
                    city: user.city || prev.profile.city,
                    goal: user.goal || prev.profile.goal,
                  },
                }
              : prev,
          );
        }).catch(() => {});
      },

      setProfileAvatar: (uri) => {
        setState((prev) => ({ ...prev, profileAvatarUri: uri }));
        const current = sessionRef.current;
        if (uri && current) {
          // Upload → store the CDN URL on the account; failure only loses the sync, not the photo.
          api
            .uploadImage(uri, `avatar-${Date.now()}.jpg`)
            .then(({ url }) => api.updateMe({ avatarUrl: url }))
            .catch(() => {});
        }
      },

      setTheme: (id) => {
        setActiveTheme(id);
        setState((prev) => ({ ...prev, theme: id, themeChosen: true }));
      },

      setLanguage: (id) => {
        setActiveLanguage(id);
        setState((prev) => ({ ...prev, language: id }));
      },

      signOut: endAccountSession,
      completeOnboarding: () => setState((prev) => ({ ...prev, onboardingDone: true })),

      restoreInterests: (ids) =>
        setState((prev) => (prev.interests.length === 0 && ids.length > 0 ? { ...prev, interests: ids } : prev)),
      toggleInterest: (id) => {
        setState((prev) => {
          const interests = prev.interests.includes(id)
            ? prev.interests.filter((item) => item !== id)
            : [...prev.interests, id];
          if (sessionRef.current) api.updateMe({ interests }).catch(() => {});
          return { ...prev, interests };
        });
      },
      isInterestSelected: (id) => state.interests.includes(id),

      toggleSavedCourse: (id) =>
        setState((prev) => ({
          ...prev,
          savedCourseIds: prev.savedCourseIds.includes(id)
            ? prev.savedCourseIds.filter((item) => item !== id)
            : [id, ...prev.savedCourseIds],
        })),
      toggleSavedRecipe: (id) =>
        setState((prev) => ({
          ...prev,
          savedRecipeIds: prev.savedRecipeIds.includes(id)
            ? prev.savedRecipeIds.filter((item) => item !== id)
            : [id, ...prev.savedRecipeIds],
        })),
      isCourseSaved: (id) => state.savedCourseIds.includes(id),
      isRecipeSaved: (id) => state.savedRecipeIds.includes(id),

      isEnrolled: (courseId) => Boolean(state.enrollments[courseId]),
      addEnrollment: (enrollment) =>
        setState((prev) => ({ ...prev, enrollments: { ...prev.enrollments, [enrollment.courseId]: enrollment } })),
      hydrateLearning,

      lessonProgress,
      completedCount: (course) =>
        course.lessons.filter((lesson) => lessonProgress(course.id, lesson.id).completed).length,
      courseProgressRatio: (course) => {
        if (course.lessons.length === 0) return 0;
        const completed = course.lessons.filter((lesson) => lessonProgress(course.id, lesson.id).completed).length;
        return completed / course.lessons.length;
      },
      resumeLesson: (course) => {
        const enrolled = Boolean(state.enrollments[course.id]);
        const playable = course.lessons.filter((lesson) => enrolled || lesson.isPreview);
        const inProgress = playable.find((lesson) => {
          const entry = lessonProgress(course.id, lesson.id);
          return !entry.completed && entry.positionSec > 0;
        });
        const nextUnfinished = playable.find((lesson) => !lessonProgress(course.id, lesson.id).completed);
        const target = inProgress ?? nextUnfinished ?? playable[0];
        if (!target) return null;
        return { lesson: target, positionSec: inProgress ? lessonProgress(course.id, target.id).positionSec : 0 };
      },
      setLessonComplete: (course, lessonId, complete) => {
        patchProgress(course.id, lessonId, { completed: complete });
        scheduleProgressSync(course);
      },
      setLessonPosition: (course, lessonId, positionSec) => {
        patchProgress(course.id, lessonId, { positionSec });
        scheduleProgressSync(course);
      },

      noteFor: (lessonId) => state.notes[lessonId] ?? '',
      setNote: (lessonId, text) => setState((prev) => ({ ...prev, notes: { ...prev.notes, [lessonId]: text } })),

      ratingFor: (courseId) => state.ratings[courseId] ?? null,
      setRating: (rating) =>
        setState((prev) => ({
          ...prev,
          ratings: { ...prev.ratings, [rating.courseId]: rating },
        })),

      setPreference: (key, value) =>
        setState((prev) => ({
          ...prev,
          preferences: { ...prev.preferences, [key]: value },
        })),
      markNotificationsRead,
      setNotificationsUnread,
      resetDeviceData: () => {
        // Local-only fields go back to their defaults; the account's own data is fetched again below.
        setState((prev) => ({
          ...seedState(),
          onboardingDone: prev.onboardingDone,
          interests: prev.interests,
          preferences: prev.preferences,
          ratings: prev.ratings,
          theme: prev.theme,
          themeChosen: prev.themeChosen,
          language: prev.language,
          profileAvatarUri: prev.profileAvatarUri,
        }));
        if (session) void hydrateLearning();
      },
    };
  }, [ready, session, state, settings, patchProgress, scheduleProgressSync, hydrateLearning]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside StoreProvider');
  return value;
}
