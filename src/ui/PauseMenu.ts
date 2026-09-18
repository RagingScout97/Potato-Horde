/**
 * In-run pause menu: Resume / Settings / Quit (T439, T456).
 */

import * as Phaser from 'phaser';
import { GameConfig } from '@/data/GameConfig';
import { loadSave, writeSave } from '@/save/SaveManager';
import { Fonts } from '@/ui/fonts';
import { attachButtonFeedback } from '@/ui/buttonFeedback';
import {
  applyMuteToGame,
  ColorblindSafe,
  cycleUiScale,
  scaledPx,
} from '@/ui/settingsAccess';

export type PauseMenuHandlers = {
  onResume: () => void;
  onQuit: () => void;
  onSettingsChanged?: () => void;
};

export class PauseMenu {
  private readonly scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private settingsPanel: Phaser.GameObjects.Container;
  private visible = false;
  private inSettings = false;
  private handlers: PauseMenuHandlers | null = null;
  private focusIndex = 0;
  private focusables: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(2800).setScrollFactor(0).setVisible(false);
    this.settingsPanel = scene.add.container(0, 0).setScrollFactor(0).setVisible(false);
    this.root.add(this.settingsPanel);
    this.buildMain();
  }

  private buildMain(): void {
    const dim = this.scene.add
      .rectangle(
        GameConfig.logicalWidth / 2,
        GameConfig.logicalHeight / 2,
        GameConfig.logicalWidth,
        GameConfig.logicalHeight,
        0x020617,
        0.78,
      )
      .setScrollFactor(0);
    this.root.add(dim);

    const title = this.scene.add
      .text(GameConfig.logicalWidth / 2, 180, 'PAUSED', {
        fontFamily: Fonts.display,
        fontSize: scaledPx(40),
        color: '#fbbf24',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.root.add(title);

    const hint = this.scene.add
      .text(GameConfig.logicalWidth / 2, 230, 'P / Esc · Tab cycles · Enter selects', {
        fontFamily: Fonts.ui,
        fontSize: scaledPx(12),
        color: ColorblindSafe.muted,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.root.add(hint);

    this.focusables = [];
    const btns: Array<[string, () => void]> = [
      ['RESUME', () => this.handlers?.onResume()],
      ['SETTINGS', () => this.showSettings(true)],
      ['QUIT TO MENU', () => this.handlers?.onQuit()],
    ];
    btns.forEach(([label, fn], i) => {
      const t = this.makeBtn(GameConfig.logicalWidth / 2, 300 + i * 64, label, fn);
      this.focusables.push(t);
    });
  }

  private makeBtn(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, label, {
        fontFamily: Fonts.display,
        fontSize: scaledPx(22),
        color: '#e2e8f0',
        backgroundColor: '#1e293b',
        padding: { x: 28, y: 14 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    // Large hit target (T452)
    t.setInteractive(
      new Phaser.Geom.Rectangle(-140, -28, 280, 56),
      Phaser.Geom.Rectangle.Contains,
    );
    t.input!.cursor = 'pointer';
    attachButtonFeedback(this.scene, t);
    t.on('pointerdown', onClick);
    this.root.add(t);
    return t;
  }

  private showSettings(on: boolean): void {
    this.inSettings = on;
    this.settingsPanel.removeAll(true);
    this.settingsPanel.setVisible(on);
    if (!on) {
      this.focusIndex = 0;
      return;
    }

    const save = loadSave();
    const cx = GameConfig.logicalWidth / 2;
    this.settingsPanel.add(
      this.scene.add
        .rectangle(cx, GameConfig.logicalHeight / 2, 520, 420, 0x0f172a, 0.98)
        .setStrokeStyle(2, 0x38bdf8)
        .setScrollFactor(0),
    );
    this.settingsPanel.add(
      this.scene.add
        .text(cx, 190, 'RUN SETTINGS', {
          fontFamily: Fonts.display,
          fontSize: scaledPx(22),
          color: '#38bdf8',
        })
        .setOrigin(0.5)
        .setScrollFactor(0),
    );

    const rows: Array<[string, () => void]> = [
      [
        `Mute: ${save.settings.muted ? 'ON' : 'OFF'}`,
        () => {
          const s = loadSave();
          s.settings.muted = !s.settings.muted;
          writeSave(s);
          applyMuteToGame(this.scene.game, s.settings.muted);
          this.showSettings(true);
          this.handlers?.onSettingsChanged?.();
        },
      ],
      [
        `Reduce shake: ${save.settings.reduceShake ? 'ON' : 'OFF'}`,
        () => {
          const s = loadSave();
          s.settings.reduceShake = !s.settings.reduceShake;
          writeSave(s);
          this.showSettings(true);
          this.handlers?.onSettingsChanged?.();
        },
      ],
      [
        `Damage numbers: ${save.settings.showDamageNumbers !== false ? 'ON' : 'OFF'}`,
        () => {
          const s = loadSave();
          s.settings.showDamageNumbers = !(s.settings.showDamageNumbers !== false);
          writeSave(s);
          this.showSettings(true);
          this.handlers?.onSettingsChanged?.();
        },
      ],
      [
        `Performance mode: ${save.settings.performanceMode ? 'ON' : 'OFF'}`,
        () => {
          const s = loadSave();
          s.settings.performanceMode = !s.settings.performanceMode;
          writeSave(s);
          this.showSettings(true);
          this.handlers?.onSettingsChanged?.();
        },
      ],
      [
        `UI scale: ${Math.round((save.settings.uiScale ?? 1) * 100)}%`,
        () => {
          cycleUiScale();
          this.showSettings(true);
          this.handlers?.onSettingsChanged?.();
        },
      ],
      [
        `Colorblind aids: ${save.settings.colorblindMode ? 'ON' : 'OFF'}`,
        () => {
          const s = loadSave();
          s.settings.colorblindMode = !s.settings.colorblindMode;
          writeSave(s);
          this.showSettings(true);
          this.handlers?.onSettingsChanged?.();
        },
      ],
      ['[ BACK ]', () => this.showSettings(false)],
    ];

    rows.forEach(([label, fn], i) => {
      const t = this.scene.add
        .text(cx, 240 + i * 40, label, {
          fontFamily: Fonts.ui,
          fontSize: scaledPx(14),
          color: '#cbd5e1',
          backgroundColor: '#1e293b',
          padding: { x: 16, y: 8 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      attachButtonFeedback(this.scene, t);
      t.on('pointerdown', fn);
      this.settingsPanel.add(t);
    });
  }

  open(handlers: PauseMenuHandlers): void {
    this.handlers = handlers;
    this.visible = true;
    this.inSettings = false;
    this.settingsPanel.setVisible(false);
    this.root.setVisible(true);
    this.focusIndex = 0;
  }

  close(): void {
    this.visible = false;
    this.inSettings = false;
    this.settingsPanel.setVisible(false);
    this.root.setVisible(false);
    this.handlers = null;
  }

  isOpen(): boolean {
    return this.visible;
  }

  /** Keyboard focus order (T453). */
  handleTab(shift: boolean): void {
    if (!this.visible || this.inSettings || this.focusables.length === 0) return;
    const n = this.focusables.length;
    this.focusIndex = shift
      ? (this.focusIndex - 1 + n) % n
      : (this.focusIndex + 1) % n;
    this.focusables.forEach((t, i) => {
      t.setColor(i === this.focusIndex ? '#fbbf24' : '#e2e8f0');
    });
  }

  handleEnter(): boolean {
    if (!this.visible || this.inSettings) return false;
    const obj = this.focusables[this.focusIndex];
    if (!obj) return false;
    obj.emit('pointerdown');
    return true;
  }

  /** Esc inside settings closes panel; else resume. */
  handleEsc(): 'settings' | 'resume' | 'none' {
    if (!this.visible) return 'none';
    if (this.inSettings) {
      this.showSettings(false);
      return 'settings';
    }
    this.handlers?.onResume();
    return 'resume';
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
