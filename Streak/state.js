// Shared mutable state — import and mutate these directly across modules.

export const urlParams = new URLSearchParams(window.location.search);
export const publicUser = urlParams.get("user");
export const publicStreak = urlParams.get("streak");

export let userId = null;
export let cache = {};
export let prevStats = { current: 0, longest: 0, total: 0 };
export let currentStreakName = "default";
export let currentStreakDisplayName = null;
export let publicMode = false;
export let guestMode = false;
export let viewYear = null;
export let viewMonth = null;

// Setters (needed because ES module bindings are live but not assignable from outside)
export function setUserId(v)                    { userId = v; }
export function setCache(v)                     { cache = v; }
export function setCacheEntry(k, v)             { cache[k] = v; }
export function setPrevStats(v)                 { prevStats = v; }
export function setCurrentStreakName(v)         { currentStreakName = v; }
export function setCurrentStreakDisplayName(v)  { currentStreakDisplayName = v; }
export function setPublicMode(v)                { publicMode = v; }
export function setGuestMode(v)                 { guestMode = v; }
export function setViewYear(v)                  { viewYear = v; }
export function setViewMonth(v)                 { viewMonth = v; }
