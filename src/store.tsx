/**
 * App state: one context, local persistence, no extra state library.
 *
 * Account-scoped data (enrollments, progress, notes, saved items) and light preferences
 * (onboarding done, interests, notification settings) live in AsyncStorage.
 * The session token lives in the auth service, which uses the platform secure store.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { DEFAULT_THEME, isThemeId, setActiveTheme, type ThemeId } from '@/constants/theme';
import { DEFAULT_LANGUAGE, isLanguage, setActiveLanguage, type Language } from '@/i18n';
import { storage } from '@/lib/storage';
import { authService } from '@/services/auth';
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
  /** courseId -> the rating the learner gave it. Editable, and kept on this device. */
  ratings: Record<Id, CourseRating>;
  interests: string[];
  savedCourseIds: Id[];
  savedRecipeIds: Id[];
  enrollments: Record<Id, Enrollment>;
  /** courseId -> lessonId -> progress */
  progress: Record<Id, Record<Id, LessonProgress>>;
  notes: Record<Id, string>;
  notificationsRead: boolean;
  preferences: NotificationPrefs;
  /**
   * Profile photo chosen on this device, as a data URI (web) or a local file URI (native).
   * It lives here rather than in the session because SecureStore refuses values over ~2 KB.
   */
  profileAvatarUri: string | null;
  /**
   * Chosen look. A device preference rather than account data, so it survives sign-out.
   */
  theme: ThemeId;
  /**
   * Chosen interface language. Also a device preference: a learner who switched to Hindi should not be
   * flipped back to English by signing out.
   */
  language: Language;
};

/** The demo account starts with one course already in progress so Home is not empty. */
function seedState(): PersistedState {
  return {
    onboardingDone: false,
    ratings: {},
    interests: [],
    savedCourseIds: [],
    savedRecipeIds: [],
    enrollments: {
      'milk-foundations': {
        courseId: 'milk-foundations',
        purchasedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
        priceInr: 0,
        source: 'sample-seed',
      },
    },
    progress: {
      'milk-foundations': {
        'milk-foundations-l1': { completed: true, positionSec: 0 },
        'milk-foundations-l2': { completed: true, positionSec: 0 },
        'milk-foundations-l3': { completed: true, positionSec: 0 },
        'milk-foundations-l4': { completed: false, positionSec: 214 },
      },
    },
    notes: {},
    notificationsRead: false,
    preferences: { courseUpdates: true, learningReminders: true, productNews: false },
    profileAvatarUri: null,
    theme: DEFAULT_THEME,
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
    merged.theme = isThemeId(merged.theme) ? merged.theme : DEFAULT_THEME;
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

  signIn: (session: Session) => void;
  signOut: () => Promise<void>;
  /** Merges profile edits into the session and writes it back to the secure store. */
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  setProfileAvatar: (uri: string | null) => void;
  /** Applies a theme immediately (whole tree) and remembers it for the next launch. */
  setTheme: (id: ThemeId) => void;
  /** Switches the whole interface to another language, immediately, and remembers the choice. */
  setLanguage: (id: Language) => void;
  completeOnboarding: () => void;

  toggleInterest: (id: string) => void;
  isInterestSelected: (id: string) => boolean;

  toggleSavedCourse: (id: Id) => void;
  toggleSavedRecipe: (id: Id) => void;
  isCourseSaved: (id: Id) => boolean;
  isRecipeSaved: (id: Id) => boolean;

  isEnrolled: (courseId: Id) => boolean;
  addEnrollment: (enrollment: Enrollment) => void;

  lessonProgress: (courseId: Id, lessonId: Id) => LessonProgress;
  completedCount: (course: Course) => number;
  courseProgressRatio: (course: Course) => number;
  resumeLesson: (course: Course) => { lesson: Lesson; positionSec: number } | null;
  setLessonComplete: (courseId: Id, lessonId: Id, complete: boolean) => void;
  setLessonPosition: (courseId: Id, lessonId: Id, positionSec: number) => void;

  noteFor: (lessonId: Id) => string;
  setNote: (lessonId: Id, text: string) => void;

  ratingFor: (courseId: Id) => CourseRating | null;
  /** Writes (or overwrites) the learner's rating for a course. */
  setRating: (rating: CourseRating) => void;

  setPreference: (key: keyof NotificationPrefs, value: boolean) => void;
  markNotificationsRead: () => void;
  resetDemoData: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(seedState);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Every storage call is already bounded and never rejects (see @/lib/storage), and the
      // boot gate is released no matter what happens here — a locked-down browser must not
      // leave the app on a blank screen.
      let raw: string | null = null;
      let storedSession = null;
      try {
        [raw, storedSession] = await Promise.all([storage.get(STORAGE_KEY), authService.getSession()]);
      } catch {
        // Storage is unavailable; the app continues with the seeded demo state.
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

  const value = useMemo<StoreValue>(() => {
    const lessonProgress = (courseId: Id, lessonId: Id) =>
      state.progress[courseId]?.[lessonId] ?? { completed: false, positionSec: 0 };

    return {
      ready,
      session,
      state,

      signIn: (next) => setSession(next),
      updateProfile: async (patch) => {
        const current = session;
        if (!current) return;
        const next: Session = { ...current, profile: { ...current.profile, ...patch } };
        setSession(next);
        await authService.saveSession(next);
      },

      setProfileAvatar: (uri) => setState((prev) => ({ ...prev, profileAvatarUri: uri })),

      setTheme: (id) => {
        setActiveTheme(id);
        setState((prev) => ({ ...prev, theme: id }));
      },

      setLanguage: (id) => {
        setActiveLanguage(id);
        setState((prev) => ({ ...prev, language: id }));
      },

      signOut: async () => {
        await authService.clearSession();
        setSession(null);
        // Learning data belongs to the account, so it goes with the session (see README).
        setState((prev) => ({
          ...seedState(),
          onboardingDone: true,
          interests: prev.interests,
          preferences: prev.preferences,
          // The look and the language belong to the device, not to the account.
          theme: prev.theme,
          language: prev.language,
        }));
      },
      completeOnboarding: () => setState((prev) => ({ ...prev, onboardingDone: true })),

      toggleInterest: (id) =>
        setState((prev) => ({
          ...prev,
          interests: prev.interests.includes(id)
            ? prev.interests.filter((item) => item !== id)
            : [...prev.interests, id],
        })),
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
      setLessonComplete: (courseId, lessonId, complete) => patchProgress(courseId, lessonId, { completed: complete }),
      setLessonPosition: (courseId, lessonId, positionSec) => patchProgress(courseId, lessonId, { positionSec }),

      noteFor: (lessonId) => state.notes[lessonId] ?? '',
      setNote: (lessonId, text) => setState((prev) => ({ ...prev, notes: { ...prev.notes, [lessonId]: text } })),

      ratingFor: (courseId) => state.ratings[courseId] ?? null,
      setRating: (rating) =>
        setState((prev) => ({
          ...prev,
          ratings: { ...prev.ratings, [rating.courseId]: rating },
        })),

      setPreference: (key, value) =>
        setState((prev) => ({ ...prev, preferences: { ...prev.preferences, [key]: value } })),
      markNotificationsRead: () => setState((prev) => ({ ...prev, notificationsRead: true })),
      resetDemoData: () =>
        setState((prev) => ({
          ...seedState(),
          onboardingDone: true,
          interests: prev.interests,
          preferences: prev.preferences,
        })),
    };
  }, [ready, session, state, patchProgress]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside StoreProvider');
  return value;
}
