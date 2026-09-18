import * as Phaser from 'phaser';
import { GameConfig } from '@/data/GameConfig';
import type { DraftCard } from '@/systems/RunBuild';
import { Fonts } from '@/ui/fonts';
import { attachButtonFeedback } from '@/ui/buttonFeedback';
import { loadSave } from '@/save/SaveManager';

/**
 * Level-up draft modal — 3 cards, click or 1/2/3 (T151–T168, T189, T212).
 * Escape does NOT close (no soft-lock skip).
 */
export class DraftUI {
  private root: Phaser.GameObjects.Container;
  private content: Phaser.GameObjects.Container;
  private cards: Phaser.GameObjects.Container[] = [];
  private rerollText: Phaser.GameObjects.Text;
  private visible = false;
  private current: DraftCard[] = [];
  private onPick: ((index: number) => void) | null = null;
  private onReroll: (() => void) | null = null;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(3000).setScrollFactor(0).setVisible(false);
    this.content = scene.add.container(0, 0).setScrollFactor(0);
    this.root.add(this.content);

    const dim = scene.add
      .rectangle(
        GameConfig.logicalWidth / 2,
        GameConfig.logicalHeight / 2,
        GameConfig.logicalWidth,
        GameConfig.logicalHeight,
        0x020617,
        0.72,
      )
      .setScrollFactor(0);
    this.content.add(dim);

    const title = scene.add
      .text(GameConfig.logicalWidth / 2, 110, 'LEVEL UP — PICK A SKILL', {
        fontFamily: Fonts.display,
        fontSize: '24px',
        color: '#fbbf24',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.content.add(title);

    const hint = scene.add
      .text(
        GameConfig.logicalWidth / 2,
        GameConfig.logicalHeight - 48,
        'Keys 1 / 2 / 3 or click · R reroll · Esc stays open',
        {
          fontFamily: Fonts.ui,
          fontSize: '13px',
          color: '#94a3b8',
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.content.add(hint);

    this.rerollText = scene.add
      .text(GameConfig.logicalWidth / 2, GameConfig.logicalHeight - 78, '', {
        fontFamily: Fonts.ui,
        fontSize: '14px',
        color: '#38bdf8',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    attachButtonFeedback(scene, this.rerollText);
    this.rerollText.on('pointerdown', () => this.onReroll?.());
    this.content.add(this.rerollText);
  }

  isOpen(): boolean {
    return this.visible;
  }

  open(
    cards: DraftCard[],
    rerollsLeft: number,
    handlers: { onPick: (index: number) => void; onReroll: () => void },
  ): void {
    this.scene.tweens.killTweensOf(this.content);
    this.current = cards;
    this.onPick = handlers.onPick;
    this.onReroll = handlers.onReroll;
    this.visible = true;
    this.root.setVisible(true);
    this.content.setAlpha(1).setScale(1);
    this.rerollText.setText(
      rerollsLeft > 0 ? `Reroll (${rerollsLeft})` : 'No rerolls left',
    );
    this.rerollText.setAlpha(rerollsLeft > 0 ? 1 : 0.4);
    this.rebuildCards(cards);

    // Open tween + optional level-up flash (respects reduceShake)
    this.content.setAlpha(0).setScale(0.92);
    this.scene.tweens.killTweensOf(this.content);
    this.scene.tweens.add({
      targets: this.content,
      alpha: 1,
      scale: 1,
      duration: 160,
      ease: 'Back.easeOut',
    });
    try {
      if (!loadSave().settings.reduceShake) {
        this.scene.cameras.main.flash(90, 251, 191, 36, false, undefined, this.scene);
      }
    } catch {
      /* ignore */
    }
  }

  refresh(cards: DraftCard[], rerollsLeft: number): void {
    this.current = cards;
    this.rerollText.setText(
      rerollsLeft > 0 ? `Reroll (${rerollsLeft})` : 'No rerolls left',
    );
    this.rerollText.setAlpha(rerollsLeft > 0 ? 1 : 0.4);
    this.rebuildCards(cards);
  }

  close(immediate = false): void {
    if (!this.visible && !immediate) return;
    this.visible = false;
    this.onPick = null;
    this.onReroll = null;
    this.scene.tweens.killTweensOf(this.content);
    if (immediate) {
      this.root.setVisible(false);
      this.clearCards();
      this.content.setAlpha(1).setScale(1);
      return;
    }
    this.scene.tweens.add({
      targets: this.content,
      alpha: 0,
      scale: 0.94,
      duration: 120,
      ease: 'Quad.easeIn',
      onComplete: () => {
        if (this.visible) return; // reopened mid-tween (multi-level queue)
        this.root.setVisible(false);
        this.clearCards();
        this.content.setAlpha(1).setScale(1);
      },
    });
  }

  tryKeyPick(keyIndex: number): boolean {
    if (!this.visible) return false;
    if (keyIndex < 0 || keyIndex >= this.current.length) return false;
    this.onPick?.(keyIndex);
    return true;
  }

  private rebuildCards(cards: DraftCard[]): void {
    this.clearCards();
    // Empty state matrix (T451)
    if (cards.length === 0) {
      const emptyWrap = this.scene.add.container(
        GameConfig.logicalWidth / 2,
        GameConfig.logicalHeight / 2,
      ).setScrollFactor(0);
      const empty = this.scene.add
        .text(
          0,
          0,
          'No skills available\n(Esc stays open — pick when cards appear)',
          {
            fontFamily: Fonts.ui,
            fontSize: '16px',
            color: '#f87171',
            align: 'center',
          },
        )
        .setOrigin(0.5)
        .setScrollFactor(0);
      emptyWrap.add(empty);
      this.content.add(emptyWrap);
      this.cards.push(emptyWrap);
      return;
    }
    const w = 220;
    const h = 180;
    const gap = 24;
    const total = cards.length * w + (cards.length - 1) * gap;
    const startX = GameConfig.logicalWidth / 2 - total / 2 + w / 2;
    const y = GameConfig.logicalHeight / 2;

    cards.forEach((card, i) => {
      const x = startX + i * (w + gap);
      const c = this.scene.add.container(x, y).setScrollFactor(0);
      const stroke = card.breakthrough ? 0xf472b6 : card.recommended ? 0xfbbf24 : 0x64748b;
      const bg = this.scene.add
        .rectangle(0, 0, w, h, card.breakthrough ? 0x3b1d3a : card.recommended ? 0x1e3a5f : 0x1e293b)
        .setStrokeStyle(2, stroke)
        .setInteractive({ useHandCursor: true });

      attachButtonFeedback(this.scene, bg, { hoverScale: 1.04, pressScale: 0.97 });

      const glyph = this.scene.add
        .rectangle(0, -58, 28, 28, card.glyphColor)
        .setStrokeStyle(2, 0xf8fafc, 0.5)
        .setScrollFactor(0);

      const key = this.scene.add
        .text(-w / 2 + 12, -h / 2 + 10, String(i + 1), {
          fontFamily: Fonts.ui,
          fontSize: '16px',
          color: '#94a3b8',
        })
        .setScrollFactor(0);
      const name = this.scene.add
        .text(0, -22, card.name, {
          fontFamily: Fonts.display,
          fontSize: '16px',
          color: '#f8fafc',
          align: 'center',
          wordWrap: { width: w - 20 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0);
      const desc = this.scene.add
        .text(0, 22, card.description, {
          fontFamily: Fonts.ui,
          fontSize: '12px',
          color: '#cbd5e1',
          align: 'center',
          wordWrap: { width: w - 24 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0);
      const lvl = this.scene.add
        .text(0, 68, card.breakthrough ? 'BREAKTHROUGH' : `Lv ${card.nextLevel}`, {
          fontFamily: Fonts.ui,
          fontSize: '12px',
          color: card.breakthrough ? '#f472b6' : '#4ade80',
        })
        .setOrigin(0.5)
        .setScrollFactor(0);

      c.add([bg, glyph, key, name, desc, lvl]);

      if (card.breakthrough) {
        const badge = this.scene.add
          .text(0, -82, '★ EVOLVE', {
            fontFamily: Fonts.ui,
            fontSize: '12px',
            color: '#f472b6',
          })
          .setOrigin(0.5)
          .setScrollFactor(0);
        c.add(badge);
      } else if (card.recommended) {
        const rec = this.scene.add
          .text(0, -82, 'RECOMMENDED', {
            fontFamily: Fonts.ui,
            fontSize: '11px',
            color: '#fbbf24',
          })
          .setOrigin(0.5)
          .setScrollFactor(0);
        c.add(rec);
      }

      bg.on('pointerdown', () => this.onPick?.(i));
      this.content.add(c);
      this.cards.push(c);

      c.setAlpha(0).setY(y + 16);
      this.scene.tweens.add({
        targets: c,
        alpha: 1,
        y,
        duration: 140,
        delay: 40 + i * 40,
        ease: 'Quad.easeOut',
      });
    });
  }

  private clearCards(): void {
    for (const c of this.cards) c.destroy(true);
    this.cards = [];
  }

  destroy(): void {
    this.clearCards();
    this.root.destroy(true);
  }
}
