/** Pending run mode handoff Menu/ChapterSelect → Game (T333, T345). */

export type RunMode = 'endless' | 'chapter';

export interface PendingRun {
  mode: RunMode;
  chapterId?: number;
}

let pending: PendingRun = { mode: 'endless' };

export function setPendingRun(run: PendingRun): void {
  pending = run;
}

export function consumePendingRun(): PendingRun {
  const out = pending;
  pending = { mode: 'endless' };
  return out;
}

export function peekPendingRun(): PendingRun {
  return pending;
}
