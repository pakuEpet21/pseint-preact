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

// XP/Level persistence
const XP_STORAGE_KEY = "pseint:xp:v1";
const LEVEL_STORAGE_KEY = "pseint:level:v1";

export interface XpLevel {
  xp: number;
  level: number;
}

export function loadXpLevel(): XpLevel {
  if (typeof window === "undefined") return { xp: 0, level: 1 };
  try {
    const xpRaw = window.localStorage.getItem(XP_STORAGE_KEY);
    const levelRaw = window.localStorage.getItem(LEVEL_STORAGE_KEY);
    const xp = xpRaw ? Number.parseInt(xpRaw, 10) : 0;
    const level = levelRaw ? Number.parseInt(levelRaw, 10) : 1;
    if (Number.isNaN(xp) || Number.isNaN(level)) return { xp: 0, level: 1 };
    return { xp, level };
  } catch {
    return { xp: 0, level: 1 };
  }
}

export function saveXpLevel(xp: number, level: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(XP_STORAGE_KEY, String(xp));
    window.localStorage.setItem(LEVEL_STORAGE_KEY, String(level));
  } catch {
    // storage full or unavailable; ignore
  }
}
