/**
 * Hub meta scene (Phase 16–18): currencies, upgrades, gear, heroes, settings.
 * Extends flow without wiping Menu story/tutorial polish.
 */

import * as Phaser from 'phaser';
import { GameConfig } from '@/data/GameConfig';
import { UPGRADE_DEFS, type UpgradeId } from '@/data/upgrades';
import { HEROES } from '@/data/heroes';
import { RARITY_HEX, INVENTORY_CAP, type GearItem, type GearSlot } from '@/data/gear';
import {
  exportSaveJson,
  importSaveJson,
  loadSave,
  resetSave,
  writeSave,
} from '@/save/SaveManager';
import { claimDailyLogin } from '@/systems/Rewards';
import { canAffordUpgrade, purchaseUpgrade, refundAllUpgrades, upgradeCost } from '@/systems/Upgrades';
import { computeMetaBonuses } from '@/systems/MetaStats';
import {
  equipGear,
  gearPowerScore,
  mergeGear,
  salvageGear,
  unequipSlot,
} from '@/systems/GearInventory';
import {
  isHeroUnlocked,
  selectHero,
  syncHeroUnlocks,
  unlockReason,
} from '@/systems/HeroProgress';
import { Fonts } from '@/ui/fonts';
import { attachButtonFeedback } from '@/ui/buttonFeedback';
import { UiChrome } from '@/ui/chrome';
import { fadeToScene } from '@/utils/sceneFade';
import { isDebugQuery } from '@/utils/math';
import { setPendingRun } from '@/systems/RunMode';
import {
  ACHIEVEMENTS,
  getDailyBoard,
  unlockAchievement,
  hasAchievement,
  createDailyRng,
  getPityDamageMult,
  hookCopy,
} from '@/systems/Retention';

type HubView = 'home' | 'upgrades' | 'gear' | 'heroes' | 'settings' | 'daily' | 'achievements';

export class HubScene extends Phaser.Scene {
  private view: HubView = 'home';
  private statusMsg = '';
  private confirm: {
    title: string;
    onYes: () => void;
  } | null = null;
  private mergePick: string | null = null;
  private layer!: Phaser.GameObjects.Container;

  constructor() {
    super('Hub');
  }

  init(data?: { view?: HubView; status?: string }): void {
    this.view = data?.view ?? 'home';
    this.statusMsg = data?.status ?? '';
    this.confirm = null;
    this.mergePick = null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UiChrome.bgDeepCss);
    this.cameras.main.fadeIn(200, 0, 0, 0);
    const newly = syncHeroUnlocks();
    claimDailyLogin(); // idempotent
    this.layer = this.add.container(0, 0);
    if (newly.length && !this.statusMsg) {
      this.statusMsg = `Unlocked: ${newly.join(', ')}`;
    }
    this.rebuild();

    this.input.keyboard?.on('keydown-ESC', this.onEsc, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', this.onEsc, this);
    });
  }

  private onEsc = (): void => {
    if (this.confirm) {
      this.confirm = null;
      this.rebuild();
      return;
    }
    if (this.view !== 'home') {
      this.view = 'home';
      this.rebuild();
      return;
    }
    fadeToScene(this, 'Menu', 200);
  };

  private rebuild(): void {
    this.layer.removeAll(true);
    const save = loadSave();
    const meta = computeMetaBonuses(save);

    // Header currencies
    const header = this.add
      .text(
        GameConfig.logicalWidth / 2,
        28,
        `HUB   ·   Notes ${save.meta.banknotes}   ·   Gems ${save.meta.gems}   ·   Power ${meta.powerScore}`,
        {
          fontFamily: Fonts.display,
          fontSize: '22px',
          color: UiChrome.accentCss,
        },
      )
      .setOrigin(0.5);
    this.layer.add(header);

    if (this.statusMsg) {
      this.layer.add(
        this.add
          .text(GameConfig.logicalWidth / 2, 56, this.statusMsg, {
            fontFamily: Fonts.ui,
            fontSize: '13px',
            color: '#4ade80',
          })
          .setOrigin(0.5),
      );
    }

    if (this.confirm) {
      this.drawConfirm();
      return;
    }

    switch (this.view) {
      case 'home':
        this.drawHome(meta.powerScore);
        break;
      case 'upgrades':
        this.drawUpgrades();
        break;
      case 'gear':
        this.drawGear();
        break;
      case 'heroes':
        this.drawHeroes();
        break;
      case 'settings':
        this.drawSettings();
        break;
      case 'daily':
        this.drawDaily();
        break;
      case 'achievements':
        this.drawAchievements();
        break;
    }
  }

  private navBtn(
    x: number,
    y: number,
    label: string,
    color: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const t = this.add
      .text(x, y, label, {
        fontFamily: Fonts.display,
        fontSize: '22px',
        color,
        backgroundColor: UiChrome.panelCss,
        padding: { x: 22, y: 14 },
      })
      .setOrigin(0.5);
    // Large hit targets (T452) — min ~48px tall
    t.setInteractive(
      new Phaser.Geom.Rectangle(-200, -30, 400, 60),
      Phaser.Geom.Rectangle.Contains,
    );
    if (t.input) t.input.cursor = 'pointer';
    attachButtonFeedback(this, t);
    t.on('pointerdown', onClick);
    this.layer.add(t);
    return t;
  }

  private drawHome(power: number): void {
    const cx = GameConfig.logicalWidth / 2;
    this.layer.add(
      this.add
        .text(cx, 90, `Loadout power ${power}  ·  Hero ${loadSave().meta.equippedHeroId}`, {
          fontFamily: Fonts.ui,
          fontSize: '14px',
          color: UiChrome.mutedCss,
        })
        .setOrigin(0.5),
    );

    const rows: Array<[string, string, () => void]> = [
      [
        'PLAY ENDLESS',
        UiChrome.hpCss,
        () => {
          setPendingRun({ mode: 'endless' });
          fadeToScene(this, 'Game', 180);
        },
      ],
      ['CHAPTERS', '#e8c070', () => fadeToScene(this, 'ChapterSelect', 180)],
      ['DAILY CHALLENGE', '#d4a574', () => this.setView('daily')],
      ['ACHIEVEMENTS', UiChrome.accentCss, () => this.setView('achievements')],
      ['UPGRADES', UiChrome.accentCss, () => this.setView('upgrades')],
      ['GEAR', '#e879a9', () => this.setView('gear')],
      ['HEROES', '#f97316', () => this.setView('heroes')],
      ['SETTINGS', UiChrome.mutedCss, () => this.setView('settings')],
    ];
    rows.forEach(([label, color, fn], i) => {
      this.navBtn(cx, 132 + i * 56, label, color, fn);
    });

    const pity = getPityDamageMult();
    if (pity > 1) {
      this.layer.add(
        this.add
          .text(cx, 530, `Pity buff active: +${Math.round((pity - 1) * 100)}% damage`, {
            fontFamily: Fonts.ui,
            fontSize: '13px',
            color: '#4ade80',
          })
          .setOrigin(0.5),
      );
    }

    this.navBtn(cx, 680, '[ MENU ]', '#64748b', () => fadeToScene(this, 'Menu', 200));
  }

  private drawDaily(): void {
    const board = getDailyBoard();
    const cx = GameConfig.logicalWidth / 2;
    this.layer.add(
      this.add
        .text(cx, 80, 'DAILY CHALLENGE', {
          fontFamily: Fonts.display,
          fontSize: '24px',
          color: '#d4a574',
        })
        .setOrigin(0.5),
    );
    this.layer.add(
      this.add
        .text(
          cx,
          140,
          `Day ${board.day}\nSeed ${board.seed}\nBest kills ${board.bestKills}\nBest time ${Math.floor(board.bestSeconds / 60)}:${String(Math.floor(board.bestSeconds % 60)).padStart(2, '0')}\n\n${hookCopy(2)}`,
          {
            fontFamily: Fonts.ui,
            fontSize: '16px',
            color: '#e2e8f0',
            align: 'center',
          },
        )
        .setOrigin(0.5, 0),
    );
    this.navBtn(cx, 420, 'PLAY DAILY (seeded endless)', '#d4a574', () => {
      unlockAchievement('daily_try');
      void createDailyRng(); // seed reserved for future draft RNG wiring
      setPendingRun({ mode: 'endless' });
      fadeToScene(this, 'Game', 180);
    });
    this.navBtn(cx, 660, '[ BACK ]', UiChrome.mutedCss, () => this.setView('home'));
  }

  private drawAchievements(): void {
    const cx = GameConfig.logicalWidth / 2;
    this.layer.add(
      this.add
        .text(cx, 72, 'ACHIEVEMENTS', {
          fontFamily: Fonts.display,
          fontSize: '24px',
          color: '#fbbf24',
        })
        .setOrigin(0.5),
    );
    ACHIEVEMENTS.forEach((a, i) => {
      const unlocked = hasAchievement(a.id);
      this.layer.add(
        this.add
          .text(
            cx,
            130 + i * 48,
            `${unlocked ? '✓' : '○'} ${a.name} — ${a.desc}`,
            {
              fontFamily: Fonts.ui,
              fontSize: '15px',
              color: unlocked ? '#4ade80' : '#64748b',
            },
          )
          .setOrigin(0.5),
      );
    });
    this.navBtn(cx, 660, '[ BACK ]', UiChrome.mutedCss, () => this.setView('home'));
  }

  private setView(v: HubView): void {
    this.view = v;
    this.statusMsg = '';
    this.mergePick = null;
    this.rebuild();
  }

  private drawUpgrades(): void {
    const save = loadSave();
    this.layer.add(
      this.add
        .text(GameConfig.logicalWidth / 2, 80, 'PERMANENT UPGRADES', {
          fontFamily: Fonts.display,
          fontSize: '24px',
          color: '#e2e8f0',
        })
        .setOrigin(0.5),
    );

    UPGRADE_DEFS.forEach((def, i) => {
      const y = 130 + i * 70;
      const lvl = save.meta.upgrades?.[def.id] ?? 0;
      const cost = upgradeCost(def.id, lvl);
      const maxed = lvl >= def.maxLevel;
      const affordable = canAffordUpgrade(def.id, save);
      const line = maxed
        ? `${def.name}  Lv ${lvl}/${def.maxLevel}  MAX`
        : `${def.name}  Lv ${lvl}/${def.maxLevel}  ·  cost ${cost}  ·  ${def.description}`;
      const color = maxed ? '#64748b' : affordable ? '#e2e8f0' : '#f87171';
      const row = this.add
        .text(GameConfig.logicalWidth / 2, y, line, {
          fontFamily: Fonts.ui,
          fontSize: '15px',
          color,
        })
        .setOrigin(0.5);
      this.layer.add(row);
      if (!maxed) {
        row.setInteractive({ useHandCursor: true });
        attachButtonFeedback(this, row);
        row.on('pointerdown', () => {
          this.confirm = {
            title: `Spend ${cost} banknotes on ${def.name}?`,
            onYes: () => {
              const r = purchaseUpgrade(def.id as UpgradeId);
              this.statusMsg = r.ok
                ? `Upgraded ${def.name} → Lv ${r.level}`
                : r.error === 'cannot_afford'
                  ? 'Not enough banknotes'
                  : 'Cannot upgrade';
              this.confirm = null;
              this.rebuild();
            },
          };
          this.rebuild();
        });
      }
    });

    if (isDebugQuery()) {
      this.navBtn(GameConfig.logicalWidth / 2, 520, '[DEBUG] Refund upgrades', '#f87171', () => {
        const n = refundAllUpgrades();
        this.statusMsg = `Refunded ${n} banknotes`;
        this.rebuild();
      });
    }

    this.navBtn(GameConfig.logicalWidth / 2, 640, '[ BACK ]', UiChrome.mutedCss, () =>
      this.setView('home'),
    );
  }

  private drawGear(): void {
    const save = loadSave();
    const inv = save.meta.inventoryGear ?? [];
    const g = save.meta.gear;
    this.layer.add(
      this.add
        .text(
          GameConfig.logicalWidth / 2,
          72,
          `GEAR  ${inv.length}/${INVENTORY_CAP}  ·  click equip · M+click merge · S salvage`,
          {
            fontFamily: Fonts.display,
            fontSize: '18px',
            color: '#e2e8f0',
          },
        )
        .setOrigin(0.5),
    );

    const slots: Array<[GearSlot, string | null]> = [
      ['weapon', g.weaponId],
      ['armor', g.armorId],
      ['accessory', g.accessoryId],
    ];
    slots.forEach(([slot, id], i) => {
      const item = id ? inv.find((x) => x.id === id) : null;
      const label = item
        ? `${slot.toUpperCase()}: ${item.name} [${item.rarity}] P${gearPowerScore(item)}`
        : `${slot.toUpperCase()}: empty`;
      const t = this.add
        .text(80, 110 + i * 28, label, {
          fontFamily: Fonts.ui,
          fontSize: '14px',
          color: item ? RARITY_HEX[item.rarity] : '#64748b',
        })
        .setInteractive({ useHandCursor: !!item });
      this.layer.add(t);
      if (item) {
        t.on('pointerdown', () => {
          unequipSlot(slot);
          this.statusMsg = `Unequipped ${slot}`;
          this.rebuild();
        });
      }
    });

    if (inv.length === 0) {
      this.layer.add(
        this.add
          .text(GameConfig.logicalWidth / 2, 280, 'Inventory empty — finish runs for loot', {
            fontFamily: Fonts.ui,
            fontSize: '16px',
            color: '#64748b',
          })
          .setOrigin(0.5),
      );
    } else {
      inv.forEach((item, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 120 + col * 520;
        const y = 210 + row * 26;
        this.drawGearRow(item, x, y, g);
      });
    }

    if (this.mergePick) {
      this.layer.add(
        this.add
          .text(GameConfig.logicalWidth / 2, 600, `Merge pick: ${this.mergePick} — click match`, {
            fontFamily: Fonts.ui,
            fontSize: '13px',
            color: '#fbbf24',
          })
          .setOrigin(0.5),
      );
    }

    this.navBtn(GameConfig.logicalWidth / 2, 660, '[ BACK ]', UiChrome.mutedCss, () =>
      this.setView('home'),
    );
  }

  private drawGearRow(
    item: GearItem,
    x: number,
    y: number,
    equipped: { weaponId: string | null; armorId: string | null; accessoryId: string | null },
  ): void {
    const eq =
      equipped.weaponId === item.id ||
      equipped.armorId === item.id ||
      equipped.accessoryId === item.id;
    const label = `${eq ? '★ ' : ''}${item.name} ${item.rarity} M${item.mergeLevel} P${gearPowerScore(item)}`;
    const t = this.add
      .text(x, y, label, {
        fontFamily: Fonts.ui,
        fontSize: '13px',
        color: RARITY_HEX[item.rarity],
      })
      .setInteractive({ useHandCursor: true });
    attachButtonFeedback(this, t);
    this.layer.add(t);

    t.on('pointerdown', () => {
      const kb = this.input.keyboard;
      const mergeMode = !!kb?.addKey('M').isDown;
      const salvageMode = !!kb?.addKey('S').isDown;
      if (salvageMode) {
        this.confirm = {
          title: `Salvage ${item.name} for banknotes?`,
          onYes: () => {
            const r = salvageGear(item.id);
            this.statusMsg = r.ok ? `+${r.banknotes} banknotes` : 'Salvage failed';
            this.confirm = null;
            this.rebuild();
          },
        };
        this.rebuild();
        return;
      }
      if (mergeMode || this.mergePick) {
        if (!this.mergePick) {
          this.mergePick = item.id;
          this.statusMsg = 'Select matching piece to merge';
          this.rebuild();
          return;
        }
        const r = mergeGear(this.mergePick, item.id);
        this.mergePick = null;
        this.statusMsg = r.ok
          ? `Merged → ${r.item?.name} M${r.item?.mergeLevel}`
          : `Merge failed: ${r.error}`;
        this.rebuild();
        return;
      }
      const r = equipGear(item.id);
      this.statusMsg = r.ok ? `Equipped ${item.name}` : 'Equip failed';
      this.rebuild();
    });
  }

  private drawHeroes(): void {
    const save = loadSave();
    this.layer.add(
      this.add
        .text(GameConfig.logicalWidth / 2, 80, 'HEROES', {
          fontFamily: Fonts.display,
          fontSize: '24px',
          color: '#e2e8f0',
        })
        .setOrigin(0.5),
    );

    HEROES.forEach((h, i) => {
      const y = 130 + i * 90;
      const unlocked = isHeroUnlocked(h.id, save);
      const selected = save.meta.equippedHeroId === h.id;
      const box = this.add.rectangle(160, y, 48, 48, h.color).setStrokeStyle(2, 0xffffff, selected ? 1 : 0.2);
      this.layer.add(box);
      const title = unlocked
        ? `${h.name}${selected ? '  ★' : ''}  —  ${h.passiveLabel}`
        : `${h.name}  LOCKED — ${unlockReason(h)}`;
      const t = this.add
        .text(220, y, title, {
          fontFamily: Fonts.ui,
          fontSize: '15px',
          color: unlocked ? '#e2e8f0' : '#475569',
          wordWrap: { width: 900 },
        })
        .setOrigin(0, 0.5);
      this.layer.add(t);
      if (unlocked) {
        t.setInteractive({ useHandCursor: true });
        box.setInteractive({ useHandCursor: true });
        attachButtonFeedback(this, t);
        const pick = () => {
          const r = selectHero(h.id);
          this.statusMsg = r.ok ? `Selected ${h.name}` : 'Cannot select';
          this.rebuild();
        };
        t.on('pointerdown', pick);
        box.on('pointerdown', pick);
      }
    });

    this.navBtn(GameConfig.logicalWidth / 2, 660, '[ BACK ]', UiChrome.mutedCss, () =>
      this.setView('home'),
    );
  }

  private drawSettings(): void {
    const save = loadSave();
    this.layer.add(
      this.add
        .text(GameConfig.logicalWidth / 2, 80, 'SETTINGS', {
          fontFamily: Fonts.display,
          fontSize: '24px',
          color: '#e2e8f0',
        })
        .setOrigin(0.5),
    );

    const toggles: Array<[string, () => void]> = [
      [
        `Mute: ${save.settings.muted ? 'ON' : 'OFF'}`,
        () => {
          save.settings.muted = !save.settings.muted;
          writeSave(save);
          this.rebuild();
        },
      ],
      [
        `Reduce shake: ${save.settings.reduceShake ? 'ON' : 'OFF'}`,
        () => {
          save.settings.reduceShake = !save.settings.reduceShake;
          writeSave(save);
          this.rebuild();
        },
      ],
      [
        `Damage numbers: ${save.settings.showDamageNumbers !== false ? 'ON' : 'OFF'}`,
        () => {
          save.settings.showDamageNumbers = !(save.settings.showDamageNumbers !== false);
          writeSave(save);
          this.rebuild();
        },
      ],
      [
        `Performance mode: ${save.settings.performanceMode ? 'ON' : 'OFF'}`,
        () => {
          save.settings.performanceMode = !save.settings.performanceMode;
          writeSave(save);
          this.rebuild();
        },
      ],
      [
        `Hitstop: ${save.settings.hitstopEnabled !== false ? 'ON' : 'OFF'}`,
        () => {
          save.settings.hitstopEnabled = !(save.settings.hitstopEnabled !== false);
          writeSave(save);
          this.rebuild();
        },
      ],
      [
        `UI scale: ${Math.round((save.settings.uiScale ?? 1) * 100)}%`,
        () => {
          const order = [0.85, 1, 1.15] as const;
          const cur = save.settings.uiScale ?? 1;
          const i = order.indexOf(cur as (typeof order)[number]);
          save.settings.uiScale = order[(i + 1) % order.length]!;
          writeSave(save);
          this.rebuild();
        },
      ],
      [
        `Colorblind aids: ${save.settings.colorblindMode ? 'ON' : 'OFF'}`,
        () => {
          save.settings.colorblindMode = !save.settings.colorblindMode;
          writeSave(save);
          this.rebuild();
        },
      ],
      [
        `Debug HUD: ${save.settings.showDebugHud ? 'ON' : 'OFF'}`,
        () => {
          save.settings.showDebugHud = !save.settings.showDebugHud;
          writeSave(save);
          this.rebuild();
        },
      ],
      [
        `Safe area pad: ${save.settings.safeAreaPad !== false ? 'ON' : 'OFF'}`,
        () => {
          save.settings.safeAreaPad = !(save.settings.safeAreaPad !== false);
          writeSave(save);
          this.rebuild();
        },
      ],
      [
        `Show FPS: ${save.settings.showFps ? 'ON' : 'OFF'}`,
        () => {
          save.settings.showFps = !save.settings.showFps;
          writeSave(save);
          this.rebuild();
        },
      ],
      [
        `Master volume: ${Math.round(save.settings.masterVolume * 100)}%  (click +10%)`,
        () => {
          const next = Math.round((save.settings.masterVolume + 0.1) * 10) / 10;
          save.settings.masterVolume = next > 1 ? 0 : next;
          writeSave(save);
          this.rebuild();
        },
      ],
      [
        `Keys (stub): ${save.settings.keyRebindStub.up}${save.settings.keyRebindStub.left}${save.settings.keyRebindStub.down}${save.settings.keyRebindStub.right} / ${save.settings.keyRebindStub.pause}`,
        () => {
          this.statusMsg = 'Key rebind UI stub — remapping ships later';
          this.rebuild();
        },
      ],
    ];

    toggles.forEach(([label, fn], i) => {
      const col = i < 7 ? 0 : 1;
      const row = i < 7 ? i : i - 7;
      this.navBtn(
        GameConfig.logicalWidth / 2 + (col === 0 ? -280 : 280),
        130 + row * 44,
        label,
        UiChrome.mutedCss,
        fn,
      );
    });

    this.navBtn(GameConfig.logicalWidth / 2, 460, 'Export save (copy JSON)', '#e8c070', () => {
      const json = exportSaveJson();
      void navigator.clipboard?.writeText(json).catch(() => undefined);
      window.prompt('Save JSON (copy):', json);
      this.statusMsg = 'Exported';
      this.rebuild();
    });

    this.navBtn(GameConfig.logicalWidth / 2, 510, 'Import save JSON', '#e8c070', () => {
      const raw = window.prompt('Paste save JSON:');
      if (!raw) return;
      const r = importSaveJson(raw);
      this.statusMsg = r.ok ? 'Import OK — refresh-safe' : `Import failed: ${r.error}`;
      this.rebuild();
    });

    this.navBtn(GameConfig.logicalWidth / 2, 560, 'RESET SAVE (danger)', '#f87171', () => {
      this.confirm = {
        title: 'Wipe ALL progress? This cannot be undone.',
        onYes: () => {
          resetSave();
          this.statusMsg = 'Save reset';
          this.confirm = null;
          this.rebuild();
        },
      };
      this.rebuild();
    });

    this.navBtn(GameConfig.logicalWidth / 2, 660, '[ BACK ]', UiChrome.mutedCss, () =>
      this.setView('home'),
    );
  }

  private drawConfirm(): void {
    if (!this.confirm) return;
    this.layer.add(
      this.add
        .rectangle(
          GameConfig.logicalWidth / 2,
          GameConfig.logicalHeight / 2,
          640,
          220,
          0x1e293b,
          0.98,
        )
        .setStrokeStyle(2, 0xfbbf24),
    );
    this.layer.add(
      this.add
        .text(GameConfig.logicalWidth / 2, GameConfig.logicalHeight / 2 - 40, this.confirm.title, {
          fontFamily: Fonts.ui,
          fontSize: '18px',
          color: '#e2e8f0',
          align: 'center',
          wordWrap: { width: 560 },
        })
        .setOrigin(0.5),
    );
    this.navBtn(GameConfig.logicalWidth / 2 - 100, GameConfig.logicalHeight / 2 + 50, '[ YES ]', '#4ade80', () => {
      this.confirm?.onYes();
    });
    this.navBtn(GameConfig.logicalWidth / 2 + 100, GameConfig.logicalHeight / 2 + 50, '[ NO ]', '#f87171', () => {
      this.confirm = null;
      this.rebuild();
    });
  }
}
