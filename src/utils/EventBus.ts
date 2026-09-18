type Handler = (payload?: unknown) => void;

/** Lightweight typed-ish event bus; unsubscribe on scene shutdown. */
export class EventBus {
  private listeners = new Map<string, Set<Handler>>();

  on(event: string, handler: Handler): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
    return () => this.off(event, handler);
  }

  once(event: string, handler: Handler): () => void {
    const wrap: Handler = (payload) => {
      unsub();
      handler(payload);
    };
    const unsub = this.on(event, wrap);
    return unsub;
  }

  off(event: string, handler: Handler): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: string, payload?: unknown): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of [...set]) {
      handler(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();

export const GameEvents = {
  Pause: 'game:pause',
  Resume: 'game:resume',
  PlayerDeath: 'player:death',
  PlayerDamaged: 'player:damaged',
  Footstep: 'player:footstep',
  DraftOpen: 'draft:open',
  DraftClose: 'draft:close',
  EnemyDeath: 'enemy:death',
  EnemyDamaged: 'enemy:damaged',
  XpDrop: 'xp:drop',
  HazardExpired: 'hazard:expired',
  BossIntro: 'boss:intro',
  BossIntroEnd: 'boss:intro-end',
  LevelUp: 'xp:level-up',
} as const;
