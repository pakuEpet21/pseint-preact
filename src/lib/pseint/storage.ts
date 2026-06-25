"use client";

export interface PersistedFile {
  id: string;
  name: string;
  content: string;
}

export interface PersistedState {
  tabs: PersistedFile[];
  activeId: string;
}

const STORAGE_KEY = "pseint-next:workspace:v1";

export function loadWorkspace(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed?.tabs?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveWorkspace(state: PersistedState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or unavailable; ignore
  }
}

export function clearWorkspace(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Challenge state persistence
const CHALLENGE_STORAGE_KEY = "pseint:challenges:v1";

export interface ChallengeState {
  completed: boolean;
  completedAt?: number;
}

export type ChallengeStore = Record<string, ChallengeState>;

export function loadChallengeState(): ChallengeStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CHALLENGE_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ChallengeStore;
  } catch {
    return {};
  }
}

export function saveChallengeState(store: ChallengeStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage full or unavailable; ignore
  }
}

// Active challenge persistence (current challenge + user code)
const ACTIVE_CHALLENGE_KEY = "pseint:active-challenge:v1";

export interface ActiveChallengeState {
  challengeId: string;
  code: string;
}

export function loadActiveChallenge(): ActiveChallengeState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_CHALLENGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveChallengeState;
  } catch {
    return null;
  }
}

export function saveActiveChallenge(state: ActiveChallengeState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_CHALLENGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or unavailable; ignore
  }
}

export function clearActiveChallenge(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ACTIVE_CHALLENGE_KEY);
  } catch {
    // ignore
  }
}


