import * as Phaser from 'phaser';
import { GameConfig } from '@/data/GameConfig';
import type { EnemyKind } from '@/data/enemies';
import { WEAPON_SKILL_IDS, getSkillOrThrow, type SkillId } from '@/data/skills';
import { applyEvolution, isBreakthroughEligible } from '@/data/evolutions';
import { DummyTarget } from '@/entities/DummyTarget';
import { Player } from '@/entities/Player';
import { ArenaSystem } from '@/systems/ArenaSystem';
import { BossSystem } from '@/systems/BossSystem';
import { CombatSystem } from '@/systems/CombatSystem';
import { EnemySystem, wireEnemyDeathXp } from '@/systems/EnemySystem';
import { HazardSystem } from '@/systems/HazardSystem';
import { AllySystem } from '@/systems/AllySystem';
import { EndlessSystem } from '@/systems/EndlessSystem';
import { SkillSystem } from '@/systems/SkillSystem';
import { SpawnerSystem } from '@/systems/SpawnerSystem';
import { XpSystem } from '@/systems/XpSystem';
import { consumePendingRun } from '@/systems/RunMode';
import { applyChapterResult } from '@/systems/ChapterProgress';
import { getChapter } from '@/data/chapters';
import type { BossKind } from '@/systems/BossSystem';
import {
  applyDraftPick,
  applySkill,
  createRunBuild,
  forceGrantSkill,
  rollDraft,
  type RunBuildState,
} from '@/systems/RunBuild';
import { DraftUI } from '@/ui/DraftUI';
import { FpsOverlay } from '@/ui/FpsOverlay';
import { Fonts } from '@/ui/fonts';
import { TutorialOverlay } from '@/ui/TutorialOverlay';
import { VirtualJoystick } from '@/ui/VirtualJoystick';
import { ComboPopup } from '@/ui/ComboPopup';
import { PauseMenu } from '@/ui/PauseMenu';
import {
  applyMuteToGame,
  scaledPx,
} from '@/ui/settingsAccess';
import { UiChrome } from '@/ui/chrome';
import { juice } from '@/systems/JuiceController';
import { eventBus, GameEvents } from '@/utils/EventBus';
import { isDebugQuery } from '@/utils/math';
import { clampDelta } from '@/utils/math';
import { fadeToScene } from '@/utils/sceneFade';
import { rng, SeededRng } from '@/utils/rng';
import { loadSave } from '@/save/SaveManager';
import {
  isTutorialCompleted,
  resetUxFlags,
  setTutorialCompleted,
} from '@/save/uxFlags';
import { computeMetaBonuses, type MetaBonuses } from '@/systems/MetaStats';
import { addToInventory, rollEndRunLoot } from '@/systems/GearInventory';
import { syncHeroUnlocks } from '@/systems/HeroProgress';
import {
  getPityDamageMult,
  recordDailyBest,
  recordRunOutcome,
  tryComebackChest,
  unlockAchievement,
  milestoneTitle,
  trackEvent,
  getSessionGoal,
} from '@/systems/Retention';
import { logGlitch } from '@/utils/harden';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private arena!: ArenaSystem;
  private combat!: CombatSystem;
  private skills!: SkillSystem;
  private enemies!: EnemySystem;
  private hazards!: HazardSystem;
  private bosses!: BossSystem;
  private allies!: AllySystem;
  private endless!: EndlessSystem;
  private meta!: MetaBonuses;
  private runId = '';
  private spawner!: SpawnerSystem;
  private xp!: XpSystem;
  private draftUI!: DraftUI;
  private tutorial: TutorialOverlay | null = null;
  private tutorialMoved = false;
  private tutorialXpSeen = false;
  private tutorialStartXp = 0;
  private runBuild!: RunBuildState;
  private draftRng!: SeededRng;
  private dummy!: DummyTarget;
  private fps!: FpsOverlay;
  private joystick!: VirtualJoystick;
  private paused = false;
  private blurPaused = false;
  private inDraft = false;
  private pauseText!: Phaser.GameObjects.Text;
  private pauseMenu!: PauseMenu;
  private comboPopup!: ComboPopup;
  private alertToast!: Phaser.GameObjects.Text;
  private controlsHint!: Phaser.GameObjects.Text;
  private hudPad = 16;
  private hpPanel!: Phaser.GameObjects.Rectangle;
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hpBarFg!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private xpBarBg!: Phaser.GameObjects.Rectangle;
  private xpBarFg!: Phaser.GameObjects.Rectangle;
  private levelText!: Phaser.GameObjects.Text;
  private enemyCountText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private killBanner!: Phaser.GameObjects.Text;
  private evoText!: Phaser.GameObjects.Text;
  private vignette!: Phaser.GameObjects.Rectangle;
  private draftLocked = false;
  private deathScheduled = false;
  private killCount = 0;
  private afkHold = false;
  private chapterId: number | null = null;
  private chapterBossKind: BossKind = 'brute';
  private chapterCleared = false;
  private chapterBossSpawned = false;
  private unsubs: Array<() => void> = [];
  private onBlur!: () => void;
  private onFocus!: () => void;
  private lastOffer: ReturnType<typeof rollDraft> = [];

  constructor() {
    super('Game');
  }

  create(): void {
    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.paused = false;
    this.draftLocked = false;
    this.inDraft = false;
    this.deathScheduled = false;
    this.killCount = 0;
    this.runId = `run_${Date.now().toString(36)}_${Math.floor(rng.next() * 1e6).toString(36)}`;
    this.meta = computeMetaBonuses(loadSave());
    this.runBuild = createRunBuild();
    this.draftRng = new SeededRng(9001);

    // Dual Pistol starter (T176)
    applySkill(this.runBuild, 'dual_pistol');

    this.arena = new ArenaSystem(this);
    this.arena.startSafeZone();

    const debug = isDebugQuery();
    this.player = new Player(
      this,
      GameConfig.arena.centerX,
      GameConfig.arena.centerY,
      debug,
    );
    this.player.setBodyColor(this.meta.heroColor);
    this.arena.follow(this.player.body);

    this.arena.enablePlayerCollision(this.player.body);
    this.combat = new CombatSystem(this, this.player, {
      isOutsideKillPlane: (x, y) => this.arena.isOutsideKillPlane(x, y),
      onBulletObstacle: (bullet, damage) => this.arena.handleBulletHit(bullet, damage),
    });

    this.skills = new SkillSystem(this, this.player, this.combat.bullets, {
      isOutsideKillPlane: (x, y) => this.arena.isOutsideKillPlane(x, y),
    });

    this.enemies = new EnemySystem(this, this.combat.enemyBullets);
    this.enemies.setArena(this.arena);
    this.hazards = new HazardSystem(this);
    this.bosses = new BossSystem(this, this.enemies);
    this.allies = new AllySystem(this, this.combat.bullets);
    this.endless = new EndlessSystem(this);

    const pending = consumePendingRun();
    this.chapterCleared = false;
    this.chapterBossSpawned = false;
    if (pending.mode === 'chapter') {
      this.chapterId = pending.chapterId ?? 1;
      const ch = getChapter(this.chapterId);
      this.chapterBossKind = ch.bossKind;
      this.endless.setMode('chapter');
      this.arena.loadMap(this.chapterId, ch.mapSeed, { animate: true });
      this.arena.enablePlayerCollision(this.player.body);
    } else {
      this.chapterId = null;
      this.endless.setMode('endless');
      // Theme id 0 = Endless Starch (distinct from Ch1 Potato Fields)
      this.arena.loadMap(0, 42042, { animate: true });
      this.arena.enablePlayerCollision(this.player.body);
    }
    this.spawner = new SpawnerSystem(this, this.enemies, this.arena, {
      endless: pending.mode === 'endless',
    });
    this.spawner.setEliteChanceFn((t) => this.endless.eliteChance(t));
    this.spawner.setScaleFn((t) => ({
      hp: this.endless.hpMult(t),
      damage: this.endless.damageMult(t),
    }));
    this.xp = new XpSystem(this);
    this.draftUI = new DraftUI(this);
    this.tutorial = null;
    this.tutorialMoved = false;
    this.tutorialXpSeen = false;
    this.tutorialStartXp = 0;

    this.combat.setTargetProvider(() => this.collectDamageables());
    this.skills.setTargetProvider(() => this.collectDamageables());
    this.allies.setTargetProvider(() => this.collectDamageables());
    this.applyBuildToSystems();

    this.dummy = new DummyTarget(
      this,
      GameConfig.arena.centerX + GameConfig.dummy.offsetX,
      GameConfig.arena.centerY + GameConfig.dummy.offsetY,
      { id: 'gate4-dummy' },
    );
    this.combat.addTarget(this.dummy);

    this.joystick = new VirtualJoystick(this);
    this.fps = new FpsOverlay(this);
    applyMuteToGame(this.game);

    const settings = loadSave().settings;
    this.hudPad = settings.safeAreaPad ? 28 : 18;
    const uiFs = (n: number) => scaledPx(n);
    const hpBarW = 188;
    const hpBarH = 14;
    const xpBarW = 188;

    this.vignette = this.add
      .rectangle(
        GameConfig.logicalWidth / 2,
        GameConfig.logicalHeight / 2,
        GameConfig.logicalWidth,
        GameConfig.logicalHeight,
        0x7f1d1d,
        0,
      )
      .setScrollFactor(0)
      .setDepth(2400)
      .setVisible(true);

    // Keep simple PAUSED label behind menu for AFK / blur (T439 menu replaces it when P pressed)
    this.pauseText = this.add
      .text(GameConfig.logicalWidth / 2, GameConfig.logicalHeight / 2, 'PAUSED', {
        fontFamily: Fonts.display,
        fontSize: uiFs(40),
        color: UiChrome.accentCss,
        stroke: '#1a1410',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2500)
      .setVisible(false);

    this.pauseMenu = new PauseMenu(this);
    this.comboPopup = new ComboPopup(this);

    this.alertToast = this.add
      .text(GameConfig.logicalWidth / 2, 118, '', {
        fontFamily: Fonts.display,
        fontSize: uiFs(16),
        color: UiChrome.accentCss,
        stroke: '#1a1410',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2550)
      .setVisible(false);

    this.killBanner = this.add
      .text(GameConfig.logicalWidth / 2, 88, '', {
        fontFamily: Fonts.display,
        fontSize: uiFs(20),
        color: UiChrome.hpCss,
        stroke: '#1a1410',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2500)
      .setVisible(false);

    // Persistent HUD core — HP panel + bar + numeric always visible (T228 / T448)
    const hpClusterY = this.hudPad + 8;
    this.hpPanel = this.add
      .rectangle(this.hudPad - 6, hpClusterY - 6, hpBarW + 28, 52, UiChrome.panel, 0.92)
      .setOrigin(0, 0)
      .setStrokeStyle(2, UiChrome.stroke, 1)
      .setScrollFactor(0)
      .setDepth(2499);

    this.hpText = this.add
      .text(this.hudPad, hpClusterY, 'HP 100/100', {
        fontFamily: Fonts.ui,
        fontSize: uiFs(16),
        color: UiChrome.hpCss,
        stroke: '#1a1410',
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setDepth(2500);

    this.hpBarBg = this.add
      .rectangle(this.hudPad, hpClusterY + 28, hpBarW, hpBarH, UiChrome.hpTrack)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, UiChrome.stroke, 0.8)
      .setScrollFactor(0)
      .setDepth(2500);
    void this.hpPanel;
    void this.hpBarBg;
    this.hpBarFg = this.add
      .rectangle(this.hudPad, hpClusterY + 28, hpBarW, hpBarH, UiChrome.hp)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(2501);

    const xpY = hpClusterY + 64;
    this.levelText = this.add
      .text(this.hudPad, xpY, 'Lv 1', {
        fontFamily: Fonts.ui,
        fontSize: uiFs(14),
        color: UiChrome.xpCss,
        stroke: '#1a1410',
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setDepth(2500);

    this.xpBarBg = this.add
      .rectangle(this.hudPad, xpY + 22, xpBarW, 10, UiChrome.hpTrack)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, UiChrome.stroke, 0.55)
      .setScrollFactor(0)
      .setDepth(2500);
    void this.xpBarBg;
    this.xpBarFg = this.add
      .rectangle(this.hudPad, xpY + 22, 0, 10, UiChrome.xp)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(2501);

    this.enemyCountText = this.add
      .text(this.hudPad, xpY + 40, '', {
        fontFamily: Fonts.ui,
        fontSize: uiFs(12),
        color: UiChrome.mutedCss,
        stroke: '#1a1410',
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(2500)
      .setVisible(!!settings.showDebugHud);

    this.evoText = this.add
      .text(this.hudPad, xpY + 58, '', {
        fontFamily: Fonts.ui,
        fontSize: uiFs(11),
        color: '#e879a9',
        stroke: '#1a1410',
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(2500);

    this.timerText = this.add
      .text(GameConfig.logicalWidth / 2, this.hudPad + 4, '0:00', {
        fontFamily: Fonts.ui,
        fontSize: uiFs(20),
        color: UiChrome.textCss,
        stroke: '#1a1410',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(2500);

    const binds = settings.keyRebindStub;
    this.controlsHint = this.add
      .text(
        this.hudPad,
        GameConfig.logicalHeight - 32,
        `${binds.up}${binds.left}${binds.down}${binds.right} · Auto · ${binds.pause} pause · Esc menu · T tutorial`,
        {
          fontFamily: Fonts.ui,
          fontSize: uiFs(11),
          color: UiChrome.mutedCss,
        },
      )
      .setScrollFactor(0)
      .setDepth(2500);

    this.input.keyboard?.on('keydown-P', this.togglePause, this);
    this.input.keyboard?.on('keydown-R', this.onKeyR, this);
    this.input.keyboard?.on('keydown-ESC', this.onKeyEsc, this);
    this.input.keyboard?.on('keydown-TAB', this.onKeyTab, this);
    this.input.keyboard?.on('keydown-ENTER', this.onKeyEnter, this);
    this.input.keyboard?.on('keydown-ONE', () => this.onDigit(0), this);
    this.input.keyboard?.on('keydown-TWO', () => this.onDigit(1), this);
    this.input.keyboard?.on('keydown-THREE', () => this.onDigit(2), this);
    this.input.keyboard?.on('keydown-FIVE', () => this.debugSpawnFifty(), this);
    this.input.keyboard?.on('keydown-X', () => this.xp.grantXp(999), this);
    this.input.keyboard?.on('keydown-V', () => this.xp.activateVacuum(4000), this);
    this.input.keyboard?.on('keydown-B', () => this.bosses.forceSpawn('brute', this.player), this);
    this.input.keyboard?.on('keydown-Y', () => this.allies.forceDropNearPlayer(this.player), this);

    this.unsubs.push(
      eventBus.on(GameEvents.DraftOpen, () => {
        this.draftLocked = true;
        this.player.flags.draftLocked = true;
        this.player.setMoveEnabled(false);
        this.combat.setWeaponsEnabled(false);
        this.skills.setWeaponsEnabled(false);
        this.allies.setWeaponsEnabled(false);
      }),
    );
    this.unsubs.push(
      eventBus.on(GameEvents.DraftClose, () => {
        this.draftLocked = false;
        this.player.flags.draftLocked = false;
        if (!this.paused && !this.player.flags.dead) {
          this.player.setMoveEnabled(true);
          this.combat.setWeaponsEnabled(true);
          this.skills.setWeaponsEnabled(true);
          this.allies.setWeaponsEnabled(true);
        }
      }),
    );
    this.unsubs.push(
      eventBus.on(GameEvents.PlayerDeath, () => {
        this.combat.setWeaponsEnabled(false);
        this.skills.setWeaponsEnabled(false);
        this.allies.setWeaponsEnabled(false);
        this.allies.clearAll();
        this.combat.bullets.releaseAll();
        this.combat.enemyBullets.releaseAll();
        this.scheduleGameOver();
      }),
    );
    this.unsubs.push(
      eventBus.on(GameEvents.EnemyDeath, (payload) => {
        const p = payload as {
          id?: string;
          x?: number;
          y?: number;
          puddle?: { radius: number; ttlMs: number; dps: number; tickMs: number };
          boss?: boolean;
        };
        this.killCount += 1;
        this.comboPopup.registerKill(this.time.now);
        if (p?.id === 'gate4-dummy') {
          this.killBanner.setText('DUMMY DOWN — Gate 4 OK');
          this.killBanner.setVisible(true);
        }
        if (p?.boss) {
          this.killBanner.setText('BOSS CLEARED');
          this.killBanner.setVisible(true);
          this.showContextualAlert('Boss defeated!');
          if (this.chapterId != null && !this.chapterCleared) {
            this.chapterCleared = true;
            this.scheduleChapterClear();
          }
        }
        if (p?.puddle && p.x != null && p.y != null) {
          this.hazards.spawnPuddle(p.x, p.y, p.puddle);
        }
      }),
    );
    this.unsubs.push(wireEnemyDeathXp());
    this.unsubs.push(
      eventBus.on(GameEvents.LevelUp, () => {
        if (!this.inDraft) this.openDraft();
      }),
    );
    this.unsubs.push(
      eventBus.on(GameEvents.PlayerDamaged, () => {
        juice.maybeFlash(this, 60, 180, 40, 40);
        const hpRatio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 1;
        if (hpRatio < 0.25) this.showContextualAlert('Low HP!');
      }),
    );

    this.onBlur = () => {
      if (!this.paused && !this.inDraft) {
        this.blurPaused = true;
        this.setPaused(true);
      }
    };
    this.onFocus = () => {
      if (this.blurPaused && !this.inDraft) {
        this.blurPaused = false;
        this.setPaused(false);
      }
    };
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('focus', this.onFocus);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdownHandlers, this);

    const g = window as unknown as { __TEST__?: Record<string, unknown> };
    g.__TEST__ = {
      scene: 'Game',
      getPlayer: () => ({
        x: this.player.x,
        y: this.player.y,
        hp: this.player.hp,
        maxHp: this.player.maxHp,
        armor: this.player.armor,
        flags: { ...this.player.flags },
      }),
      getDummy: () => ({
        hp: this.dummy.hp,
        alive: this.dummy.alive,
        x: this.dummy.x,
        y: this.dummy.y,
      }),
      getEnemyCount: () => this.enemies.pool.getActiveCount(),
      getPuddleCount: () => this.hazards.getCount(),
      getBulletCount: () => this.combat.getActiveBulletCount(),
      getOrbCount: () => this.xp.orbs.getActiveCount(),
      getXp: () => this.xp.getState(),
      getBuild: () => ({
        ...this.runBuild,
        skills: [...this.runBuild.skills],
        evolved: [...this.runBuild.evolved],
        evolutions: [...this.runBuild.evolutions],
      }),
      getSkillsDebug: () => this.skills.getDebugCounts(),
      forceSkill: (id: SkillId) => this.debugForceSkill(id),
      forceAllWeapons: () => {
        for (const id of WEAPON_SKILL_IDS) this.debugForceSkill(id);
        return this.skills.getDebugCounts();
      },
      forceBreakthrough: (weaponId: SkillId) => {
        forceGrantSkill(this.runBuild, weaponId, 5);
        const skill = getSkillOrThrow(weaponId);
        if (skill.catalystId) forceGrantSkill(this.runBuild, skill.catalystId, 1);
        const ok = applyEvolution(this.runBuild, weaponId);
        this.applyBuildToSystems();
        if (ok) {
          this.cameras.main.flash(180, 244, 114, 182);
          this.killBanner.setText(`BREAKTHROUGH: ${weaponId}`);
          this.killBanner.setVisible(true);
        }
        return {
          ok,
          stillEligible: isBreakthroughEligible(this.runBuild, weaponId),
          evolutions: [...this.runBuild.evolutions],
        };
      },
      forceBoss: (kind: 'brute' | 'spitter' | 'splitter' = 'brute') =>
        this.bosses.forceSpawn(kind, this.player),
      clearChapter: () => {
        if (this.chapterId == null) {
          this.chapterId = 1;
          this.chapterBossKind = 'brute';
          this.endless.setMode('chapter');
          this.spawner.setEndless(false);
        }
        this.chapterCleared = true;
        this.scheduleChapterClear();
        return { chapterId: this.chapterId, cleared: true };
      },
      getChapterRun: () => ({
        chapterId: this.chapterId,
        cleared: this.chapterCleared,
        bossSpawned: this.chapterBossSpawned,
      }),
      getBoss: () => ({
        alive: this.bosses.alive,
        hp: this.bosses.getHp(),
        maxHp: this.bosses.getMaxHp(),
        phase: this.bosses.getPhase(),
        kills: this.bosses.getBossKills(),
      }),
      forceAlly: () => this.allies.forceDropNearPlayer(this.player),
      getAllies: () => ({
        count: this.allies.getActiveCount(),
        allies: this.allies.getAlliesDebug(),
      }),
      getMap: () => ({
        chapterId: this.arena.getChapterId(),
        seed: this.arena.getLayoutSeed(),
        obstacles: this.arena.getObstacleCount(),
        theme: this.arena.getTheme().name,
      }),
      getEndless: () => ({
        mode: this.endless.getMode(),
        difficulty: this.endless.getDifficulty(),
        afk: this.endless.isAfkPaused(),
        hpMult: this.endless.hpMult(this.spawner.getStats().runTimeSeconds),
        dmgMult: this.endless.damageMult(this.spawner.getStats().runTimeSeconds),
        eliteChance: this.endless.eliteChance(this.spawner.getStats().runTimeSeconds),
      }),
      getMeta: () => ({ ...this.meta, runId: this.runId }),
      getSaveCurrencies: () => {
        const s = loadSave();
        return { banknotes: s.meta.banknotes, gems: s.meta.gems };
      },
      setDifficulty: (d: 'easy' | 'normal' | 'hard') => {
        this.endless.setDifficulty(d);
        return this.endless.getDifficulty();
      },
      setMode: (m: 'endless' | 'chapter') => {
        this.endless.setMode(m);
        this.spawner.setEndless(m === 'endless');
        return this.endless.getMode();
      },
      forceAfk: () => this.endless.forceAfkNow(),
      loadMap: (chapterId: number, seed?: number) => {
        this.arena.loadMap(chapterId, seed ?? 9001, { animate: false });
        this.arena.enablePlayerCollision(this.player.body);
        return {
          chapterId: this.arena.getChapterId(),
          obstacles: this.arena.getObstacleCount(),
        };
      },
      hasLos: (x2: number, y2: number) =>
        this.arena.hasLineOfSight(this.player.x, this.player.y, x2, y2),
      killPlayer: () => {
        this.player.flags.invulnerable = false;
        this.player.takeDamage(9999);
      },
      saveBuild: () => {
        localStorage.setItem(
          'potato-horde-debug-build',
          JSON.stringify({
            ...this.runBuild,
            evolved: [...this.runBuild.evolved],
          }),
        );
        return true;
      },
      isDraftOpen: () => this.inDraft,
      grantXp: (n: number) => this.xp.grantXp(n),
      pickDraft: (i: number) => this.pickFromOpen(i),
      getSpawner: () => this.spawner.getStats(),
      killsPerMinute: () => this.spawner.killsPerMinute(),
      spawnEnemy: (kind: EnemyKind, elite = false) =>
        this.enemies.spawn(
          this.player.x + 160,
          this.player.y,
          kind,
          this.player.x,
          this.player.y,
          { elite },
        ),
      spawnFiftyMelee: () => this.debugSpawnFifty(),
      fastForward: (ms: number) => {
        if (this.paused || this.inDraft) return this.spawner.getStats();
        const step = 50;
        let left = ms;
        while (left > 0) {
          const dt = Math.min(step, left);
          this.spawner.update(0, dt, this.player);
          this.enemies.update(this.spawner.getStats().runTimeSeconds * 1000, dt, this.player);
          this.allies.update(dt, this.player, this.spawner.getStats().runTimeSeconds);
          left -= dt;
        }
        return this.spawner.getStats();
      },
      pause: () => this.setPaused(true),
      resume: () => this.setPaused(false),
      isPaused: () => this.paused,
      getCombo: () => this.comboPopup.getCombo(),
      getSettings: () => loadSave().settings,
      openPauseMenu: () => {
        this.setPaused(true);
        return this.pauseMenu.isOpen();
      },
      poolAudit: () => ({
        enemies: this.enemies.pool.getActiveCount(),
        bullets: this.combat.getActiveBulletCount(),
        orbs: this.xp.orbs.getActiveCount(),
      }),
      stressFodder: (n = 500) => {
        this.enemies.spawnRing(Math.min(500, n), 'melee', this.player.x, this.player.y, 400);
        return this.enemies.pool.getActiveCount();
      },
      reloadSceneN: (n = 1) => {
        for (let i = 0; i < n; i++) this.scene.restart();
        return n;
      },
      isTutorialActive: () => this.tutorial?.isActive() ?? false,
      skipTutorial: () => {
        setTutorialCompleted(true);
        this.tutorial?.handleEscSkip();
        return true;
      },
      resetUxFlags: () => {
        resetUxFlags();
        return true;
      },
      forceDraftLock: (on: boolean) => {
        eventBus.emit(on ? GameEvents.DraftOpen : GameEvents.DraftClose);
      },
    };

    if (!isTutorialCompleted()) {
      this.tutorialStartXp = this.xp.getState().xpIntoLevel;
      this.tutorial = new TutorialOverlay(this, {
        getPlayerMoved: () => this.tutorialMoved,
        getXpCollected: () => this.tutorialXpSeen,
        isDraftOpen: () => this.inDraft,
        isPaused: () => this.paused,
      });
      this.tutorial.start();
    }
  }

  private collectDamageables() {
    const list: import('@/systems/CombatSystem').DamageableTarget[] = [
      ...this.enemies.pool.getActive().filter((e) => e.alive),
    ];
    if (this.bosses.alive) list.push(this.bosses);
    return list;
  }

  private debugForceSkill(id: SkillId): boolean {
    // Max out for visibility, assert handler (S11 / Gate 8)
    this.skills.forceSkill(id);
    forceGrantSkill(this.runBuild, id, 5);
    this.applyBuildToSystems();
    // Spawn nearby fodder so skill can fire
    this.enemies.spawnRing(8, 'melee', this.player.x, this.player.y, 160);
    return true;
  }

  update(time: number, delta: number): void {
    const dt = clampDelta(delta);

    // AFK resume even while paused (T325)
    if (this.afkHold && !this.endless.isAfkPaused()) {
      this.afkHold = false;
      if (this.paused && !this.inDraft) this.setPaused(false);
    }

    if (this.tutorial?.isActive()) {
      if (!this.tutorialMoved) {
        const dx = this.player.x - GameConfig.arena.centerX;
        const dy = this.player.y - GameConfig.arena.centerY;
        if (Math.hypot(dx, dy) > 28) this.tutorialMoved = true;
      }
      const xp = this.xp.getState();
      if (xp.xpIntoLevel > this.tutorialStartXp || xp.level > 1) {
        this.tutorialXpSeen = true;
      }
      this.tutorial.update(time);
    }

    this.comboPopup.update(time);

    if (this.paused || this.inDraft) {
      this.refreshHud();
      return;
    }

    // NaN guard (T466)
    if (!Number.isFinite(this.player.x) || !Number.isFinite(this.player.y)) {
      logGlitch('nan_player_pos', 'reset to center', 'P1');
      this.player.body.setPosition(GameConfig.arena.centerX, GameConfig.arena.centerY);
    }

    const axis = this.joystick.getAxis();
    this.player.setExternalAxis(axis.x, axis.y);
    this.player.update(time, dt);
    // Player unstick if wedged in obstacles (T311)
    {
      const u = this.arena.unstick(this.player.x, this.player.y, GameConfig.player.visualSize);
      if (u.x !== this.player.x || u.y !== this.player.y) {
        this.player.body.setPosition(u.x, u.y);
        const pb = this.player.body.body as Phaser.Physics.Arcade.Body | null;
        pb?.reset(u.x, u.y);
      }
    }
    this.spawner.update(time, dt, this.player);
    this.enemies.update(time, dt, this.player);
    this.combat.update(time, dt);
    this.skills.update(time, dt);
    this.allies.update(dt, this.player, this.spawner.getStats().runTimeSeconds);
    this.combat.resolveHits();
    this.bosses.update(dt, this.player, this.spawner.getStats().runTimeSeconds);
    // Chapter boss at ~90s (T346–T350)
    if (
      this.chapterId != null &&
      !this.chapterBossSpawned &&
      this.spawner.getStats().runTimeSeconds >= 90
    ) {
      this.chapterBossSpawned = true;
      this.bosses.forceSpawn(this.chapterBossKind, this.player);
    }
    this.hazards.update(dt, this.player.x, this.player.y, (dmg) => {
      this.player.takeDamage(dmg, 'hazard');
    });
    this.xp.update(time, dt, this.player, {
      ...this.runBuild,
      magnetBonus: this.runBuild.magnetBonus + (this.meta?.magnetBonus ?? 0),
    });
    this.arena.updateMinimap(this.player.x, this.player.y);
    this.arena.updateAtmosphere(dt);
    this.fps.update(this.game.loop.actualFps);
    const runSec = this.spawner.getStats().runTimeSeconds;
    this.endless.update(
      runSec,
      time,
      this.game.loop.actualFps,
      this.enemies.pool.getActiveCount() + this.combat.getActiveBulletCount(),
    );
    // Anti-AFK pause 60s (T325)
    if (this.endless.isAfkPaused() && !this.paused && !this.inDraft) {
      this.afkHold = true;
      this.setPaused(true);
    }
    this.refreshHud();

    void this.draftLocked;
  }

  private refreshHud(): void {
    const save = loadSave();
    const xp = this.xp.getState();
    const hpRatio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 1;
    const hpColor = hpRatio < 0.35 ? UiChrome.hpLowCss : UiChrome.hpCss;
    const hpFill = hpRatio < 0.35 ? UiChrome.hpLow : UiChrome.hp;
    this.hpText.setColor(hpColor);
    this.hpText.setText(
      `HP ${Math.ceil(this.player.hp)}/${this.player.maxHp}` +
        (this.player.armor > 0 ? ` · AR ${this.player.armor}` : ''),
    );
    this.hpBarFg.width = 188 * Math.min(1, Math.max(0, hpRatio));
    this.hpBarFg.setFillStyle(hpFill, 1);
    // Low HP vignette (T230) — skip in performance mode
    this.vignette.setAlpha(
      save.settings.performanceMode ? 0 : hpRatio < 0.35 ? (0.35 - hpRatio) * 1.2 : 0,
    );

    this.levelText.setText(`Lv ${xp.level}`);
    const ratio = xp.xpToLevel > 0 ? xp.xpIntoLevel / xp.xpToLevel : 0;
    this.xpBarFg.width = 188 * Math.min(1, ratio);
    const stats = this.spawner.getStats();
    // Contextual debug line (T448 / T458) — off by default
    const showDbg = !!save.settings.showDebugHud;
    this.enemyCountText.setVisible(showDbg);
    if (showDbg) {
      this.enemyCountText.setText(
        `Enemies ${this.enemies.pool.getActiveCount()} · Orbs ${this.xp.orbs.getActiveCount()} · Kills ${this.killCount}`,
      );
    }
    this.timerText.setText(formatTime(stats.runTimeSeconds));
    // Owned evolutions UI (T218) — contextual, hide when empty
    this.evoText.setText(
      this.runBuild.evolutions.length
        ? `Evo: ${this.runBuild.evolutions.join(', ')}`
        : '',
    );
  }

  private showContextualAlert(msg: string): void {
    // T449 — brief toast, not permanent clutter
    this.alertToast.setText(msg);
    this.alertToast.setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(this.alertToast);
    this.tweens.add({
      targets: this.alertToast,
      alpha: 0,
      delay: 1400,
      duration: 300,
      onComplete: () => this.alertToast.setVisible(false),
    });
  }

  private applyBuildToSystems(): void {
    const meta = this.meta ?? computeMetaBonuses(loadSave());
    const pity = getPityDamageMult();
    this.combat.setRunMultipliers({
      atkSpeedMult: this.runBuild.atkSpeedMult * meta.atkSpeedMult,
      damageMult: this.runBuild.damageMult * meta.damageMult * pity,
      rangeMult: this.runBuild.rangeMult,
    });
    this.skills.syncBuild(this.runBuild);
    this.skills.setMetaDamageMult(meta.damageMult * pity);
    this.allies.syncBuild(this.runBuild);
    this.player.setMoveSpeedMult(this.runBuild.moveSpeedMult * meta.moveSpeedMult);
    this.player.setArmor(this.runBuild.armor + meta.armor);
    const base = GameConfig.playerCombat.maxHp;
    const targetMax = Math.max(1, base + this.runBuild.maxHpBonus + meta.maxHp);
    if (targetMax !== this.player.maxHp) {
      const ratio = this.player.hp / Math.max(1, this.player.maxHp);
      this.player.maxHp = targetMax;
      this.player.hp = Math.min(targetMax, Math.ceil(targetMax * ratio));
    }
    if (this.runBuild.pendingHeal > 0) {
      const runSec = this.spawner?.getStats().runTimeSeconds ?? 0;
      const heal = this.endless
        ? this.endless.scaleHeal(this.runBuild.pendingHeal, runSec)
        : this.runBuild.pendingHeal;
      this.player.heal(heal);
      this.runBuild.pendingHeal = 0;
    }
  }

  private openDraft(): void {
    if (this.inDraft) return;
    if (!this.xp.consumeLevel()) return;

    this.inDraft = true;
    this.physics.world.isPaused = true;
    this.combat.setPaused(true);
    this.skills.setPaused(true);
    this.allies.setPaused(true);
    this.enemies.setPaused(true);
    this.hazards.setPaused(true);
    this.spawner.setPaused(true);
    this.xp.setPaused(true);
    this.bosses.setPaused(true);
    eventBus.emit(GameEvents.DraftOpen);

    const cards = rollDraft(this.runBuild, this.draftRng, 3);
    this.lastOffer = cards;
    this.draftUI.open(cards, this.runBuild.rerollsLeft, {
      onPick: (i) => this.pickFromOpen(i),
      onReroll: () => this.rerollDraft(),
    });
  }

  private pickFromOpen(index: number): void {
    if (!this.inDraft) return;
    const card = this.lastOffer[index];
    if (!card) return;
    const ok = applyDraftPick(this.runBuild, card.id);
    if (!ok) {
      console.error(`Failed to apply skill ${card.id}`);
      return;
    }
    if (card.breakthrough) {
      // VFX flash (T216)
      this.cameras.main.flash(180, 244, 114, 182);
      this.killBanner.setText(`BREAKTHROUGH: ${card.breakthroughName ?? card.name}`);
      this.killBanner.setVisible(true);
    }
    this.applyBuildToSystems();
    this.closeDraftOrContinue();
  }

  private rerollDraft(): void {
    if (!this.inDraft || this.runBuild.rerollsLeft <= 0) return;
    this.runBuild.rerollsLeft -= 1;
    this.lastOffer = rollDraft(this.runBuild, this.draftRng, 3);
    this.draftUI.refresh(this.lastOffer, this.runBuild.rerollsLeft);
  }

  private closeDraftOrContinue(): void {
    if (this.xp.getPendingLevels() > 0) {
      this.draftUI.close(true);
      this.inDraft = false;
      eventBus.emit(GameEvents.DraftClose);
      this.openDraft();
      return;
    }
    this.draftUI.close();
    this.inDraft = false;
    this.physics.world.isPaused = this.paused;
    this.combat.setPaused(this.paused);
    this.skills.setPaused(this.paused);
    this.allies.setPaused(this.paused);
    this.enemies.setPaused(this.paused);
    this.hazards.setPaused(this.paused);
    this.spawner.setPaused(this.paused);
    this.xp.setPaused(this.paused);
    this.bosses.setPaused(this.paused);
    eventBus.emit(GameEvents.DraftClose);
  }

  private onDigit(index: number): void {
    if (this.inDraft) {
      if (this.lastOffer.length === 0) return;
      this.pickFromOpen(index);
      return;
    }
    const kinds: EnemyKind[] = ['melee', 'ranged', 'blob'];
    const kind = kinds[index];
    if (kind) this.debugSpawn(kind);
  }

  private onKeyR(): void {
    if (this.inDraft) {
      this.rerollDraft();
      return;
    }
    this.devRespawn();
  }

  private onKeyEsc(): void {
    if (this.inDraft) return;
    if (this.pauseMenu.isOpen()) {
      this.pauseMenu.handleEsc();
      return;
    }
    if (this.tutorial?.handleEscSkip()) return;
    if (this.paused) {
      this.setPaused(false);
      return;
    }
    this.backToMenu();
  }

  private onKeyTab = (): void => {
    if (!this.pauseMenu.isOpen()) return;
    this.pauseMenu.handleTab(false);
  };

  private onKeyEnter = (): void => {
    if (this.pauseMenu.isOpen()) this.pauseMenu.handleEnter();
  };

  private debugSpawn(kind: EnemyKind): void {
    if (this.paused || this.inDraft) return;
    const ang = rng.next() * Math.PI * 2;
    const r = 180;
    this.enemies.spawn(
      this.player.x + Math.cos(ang) * r,
      this.player.y + Math.sin(ang) * r,
      kind,
      this.player.x,
      this.player.y,
    );
  }

  private debugSpawnFifty(): void {
    if (this.paused || this.inDraft) return;
    this.enemies.spawnRing(50, 'melee', this.player.x, this.player.y, 260);
    this.killBanner.setText('50 MELEE SPAWNED');
    this.killBanner.setVisible(true);
  }

  private togglePause(): void {
    if (this.inDraft) return;
    this.setPaused(!this.paused);
  }

  private setPaused(paused: boolean): void {
    this.paused = paused;
    const showMenu = paused && !this.inDraft && !this.afkHold && !this.blurPaused;
    this.pauseText.setVisible(paused && !this.inDraft && !showMenu);
    if (showMenu) {
      this.pauseMenu.open({
        onResume: () => this.setPaused(false),
        onQuit: () => this.backToMenu(),
        onSettingsChanged: () => {
          applyMuteToGame(this.game);
          const s = loadSave().settings;
          this.enemyCountText.setVisible(!!s.showDebugHud);
          this.controlsHint.setText(
            `${s.keyRebindStub.up}${s.keyRebindStub.left}${s.keyRebindStub.down}${s.keyRebindStub.right} · Auto · ${s.keyRebindStub.pause} pause · Esc menu · T tutorial`,
          );
        },
      });
    } else {
      this.pauseMenu.close();
    }
    this.player.setPaused(paused);
    this.combat.setPaused(paused || this.inDraft);
    this.skills.setPaused(paused || this.inDraft);
    this.allies.setPaused(paused || this.inDraft);
    this.enemies.setPaused(paused || this.inDraft);
    this.hazards.setPaused(paused || this.inDraft);
    this.spawner.setPaused(paused || this.inDraft);
    this.xp.setPaused(paused || this.inDraft);
    this.bosses.setPaused(paused || this.inDraft);
    this.physics.world.isPaused = paused || this.inDraft;
    if (paused) eventBus.emit(GameEvents.Pause);
    else if (!this.inDraft) eventBus.emit(GameEvents.Resume);
  }

  private scheduleGameOver(): void {
    if (this.deathScheduled) return;
    this.deathScheduled = true;
    const stats = this.spawner.getStats();
    let chapterReward: {
      unlockedNext?: boolean;
      banknotes?: number;
      gems?: number;
      stars?: number;
      cleared?: boolean;
      chapterId?: number;
      lootName?: string;
    } = {};
    if (this.chapterId != null) {
      const r = applyChapterResult({
        chapterId: this.chapterId,
        cleared: this.chapterCleared,
        survivedSeconds: stats.runTimeSeconds,
        kills: this.killCount,
        runId: this.runId,
      });
      chapterReward = {
        ...r,
        cleared: this.chapterCleared,
        chapterId: this.chapterId,
      };
    } else {
      const r = this.endless.recordRunEnd(stats.runTimeSeconds, this.killCount, {
        runId: this.runId,
        luckBonus: this.meta?.luckBonus ?? 0,
      });
      chapterReward = { banknotes: r.banknotes, gems: r.gems };
    }

    // End-run loot (T386) — hub inventory only; does not mutate equip mid-run
    const lootRng = new SeededRng(
      (this.killCount * 997 + Math.floor(stats.runTimeSeconds) * 13 + 42) >>> 0,
    );
    const drop = rollEndRunLoot(lootRng, {
      luckBonus: this.meta?.luckBonus ?? 0,
      force: this.killCount >= 5,
    });
    if (drop) {
      const added = addToInventory(drop);
      if (added.ok && added.item) {
        chapterReward.lootName = `${added.item.name} (${added.item.rarity})`;
        if (added.salvaged) {
          chapterReward.lootName += ` · auto-salvaged old +${added.salvaged}`;
        }
      } else if (added.salvaged) {
        chapterReward.lootName = `Inv full — salvage +${added.salvaged}`;
      }
    }
    syncHeroUnlocks();

    // Retention (Phase 21)
    const survivedOk = this.chapterCleared || stats.runTimeSeconds >= 180;
    recordRunOutcome(survivedOk);
    if (!survivedOk) tryComebackChest();
    recordDailyBest(this.killCount, stats.runTimeSeconds);
    if (this.killCount >= 1) unlockAchievement('first_blood');
    if (stats.runTimeSeconds >= 300) unlockAchievement('survivor_5m');
    if (this.comboPopup.getCombo() >= 10) unlockAchievement('combo_10');
    if (this.bosses.getBossKills() > 0) unlockAchievement('boss_slayer');
    if (this.chapterCleared) unlockAchievement('chapter_clear');
    const title = milestoneTitle(stats.runTimeSeconds, this.killCount);
    if (title) trackEvent('milestone', title);
    trackEvent('run_end', this.runId);
    const goal = getSessionGoal();
    if (goal) trackEvent('session_goal', goal);

    this.time.delayedCall(900, () => {
      const xp = this.xp.getState();
      fadeToScene(this, 'Result', 250, {
        survivedSeconds: stats.runTimeSeconds,
        kills: this.killCount,
        level: xp.level,
        skills: this.runBuild.skills.map((s) => `${s.id}:${s.level}`),
        evolutions: [...this.runBuild.evolutions],
        bossKills: this.bosses.getBossKills(),
        milestoneTitle: title ?? undefined,
        ...chapterReward,
      });
    });
  }

  private scheduleChapterClear(): void {
    if (this.deathScheduled) return;
    this.killBanner.setText('CHAPTER CLEAR');
    this.killBanner.setVisible(true);
    this.combat.setWeaponsEnabled(false);
    this.skills.setWeaponsEnabled(false);
    this.allies.setWeaponsEnabled(false);
    this.scheduleGameOver();
  }

  private devRespawn(): void {
    this.deathScheduled = false;
    this.player.respawn(GameConfig.arena.centerX, GameConfig.arena.centerY);
    this.player.flashInvuln();
    this.combat.setWeaponsEnabled(true);
    this.skills.setWeaponsEnabled(true);
    this.allies.setWeaponsEnabled(true);
    this.allies.reset();
    this.endless.reset();
    this.spawner.reset();
    this.enemies.pool.releaseAll();
    this.hazards.clear();
    this.combat.bullets.releaseAll();
    this.combat.enemyBullets.releaseAll();
    this.skills.clearVisuals();
    this.xp.reset();
    this.runBuild = createRunBuild();
    applySkill(this.runBuild, 'dual_pistol');
    this.applyBuildToSystems();
    this.killCount = 0;
  }

  private backToMenu(): void {
    fadeToScene(this, 'Menu', 250);
  }

  private shutdownHandlers(): void {
    this.input.keyboard?.off('keydown-P', this.togglePause, this);
    this.input.keyboard?.off('keydown-R', this.onKeyR, this);
    this.input.keyboard?.off('keydown-ESC', this.onKeyEsc, this);
    this.input.keyboard?.off('keydown-TAB', this.onKeyTab, this);
    this.input.keyboard?.off('keydown-ENTER', this.onKeyEnter, this);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('focus', this.onFocus);
    for (const u of this.unsubs) u();
    this.unsubs = [];
    // Never throw during SHUTDOWN — an exception aborts scene.start(next) (black screen).
    const safe = (label: string, fn: () => void): void => {
      try {
        fn();
      } catch (err) {
        console.warn(`[GameScene shutdown] ${label}`, err);
      }
    };
    safe('joystick', () => this.joystick.destroy(this));
    safe('tutorial', () => {
      this.tutorial?.destroy();
      this.tutorial = null;
    });
    safe('pauseMenu', () => this.pauseMenu.destroy());
    safe('comboPopup', () => this.comboPopup.destroy());
    safe('draftUI', () => this.draftUI.destroy());
    safe('xp', () => this.xp.destroy());
    safe('spawner', () => this.spawner.destroy());
    safe('hazards', () => this.hazards.destroy());
    safe('bosses', () => this.bosses.destroy());
    safe('allies', () => this.allies.destroy());
    safe('endless', () => this.endless.destroy());
    safe('enemies', () => this.enemies.destroy());
    safe('skills', () => this.skills.destroy());
    safe('combat', () => this.combat.destroy());
    safe('dummy', () => this.dummy.destroy());
    safe('player', () => this.player.destroy());
    safe('arena', () => this.arena.destroy());
  }
}

function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
