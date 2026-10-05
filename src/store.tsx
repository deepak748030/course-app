/**
 * App state: one context, local persistence, no extra state library.
 *
 * Account-scoped data (enrollments, progress, notes, saved items) and light preferences
 * (onboarding done, interests, notification settings) live in AsyncStorage.
 * The session token lives in the auth service, which uses the platform secure store.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { authService } from '@/services/auth';
import type {
  Course,
  Enrollment,
  Id,
  Lesson,
  LessonProgress,
  NotificationPrefs,
  Session,
} from '@/types';

const STORAGE_KEY = 'rasoi.state.v1';

type PersistedState = {
  onboardingDone: boolean;
  interests: string[];
  savedCourseIds: Id[];
  savedRecipeIds: Id[];
  enrollments: Record<Id, Enrollment>;
  /** courseId -> lessonId -> progress */
  progress: Record<Id, Record<Id, LessonProgress>>;
  notes: Record<Id, string>;
  notificationsRead: boolean;
  preferences: NotificationPrefs;
};

/** The demo account starts with one course already in progress so Home is not empty. */
function seedState(): PersistedState {
  return {
    onboardingDone: false,
    interests: [],
    savedCourseIds: [],
    savedRecipeIds: [],
    enrollments: {
      'everyday-indian': {
        courseId: 'everyday-indian',
        purchasedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
        priceInr: 0,
        source: 'sample-seed',
      },
    },
    progress: {
      'everyday-indian': {
        'everyday-indian-l1': { completed: true, positionSec: 0 },
        'everyday-indian-l2': { completed: true, positionSec: 0 },
        'everyday-indian-l3': { completed: true, positionSec: 0 },
        'everyday-indian-l4': { completed: false, positionSec: 214 },
      },
    },
    notes: {},
    notificationsRead: false,
    preferences: { courseUpdates: true, learningReminders: true, productNews: false },
  };
}

type StoreValue = {
  ready: boolean;
  session: Session | null;
  state: PersistedState;

  signIn: (session: Session) => void;
  signOut: () => Promise<void>;
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
      const [raw, storedSession] = await Promise.all([AsyncStorage.getItem(STORAGE_KEY), authService.getSession()]);
      if (cancelled) return;
      if (raw) {
        try {
          setState({ ...seedState(), ...(JSON.parse(raw) as PersistedState) });
        } catch {
          // Corrupt local data should not block the app.
        }
      }
      setSession(storedSession);
      hydrated.current = true;
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
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
      signOut: async () => {
        await authService.clearSession();
        setSession(null);
        // Learning data belongs to the account, so it goes with the session (see README).
        setState((prev) => ({
          ...seedState(),
          onboardingDone: true,
          interests: prev.interests,
          preferences: prev.preferences,
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
