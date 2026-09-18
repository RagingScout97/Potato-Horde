import * as Phaser from 'phaser';
import { GameConfig } from '@/data/GameConfig';
import { BootScene } from '@/scenes/BootScene';
import { IntroScene } from '@/scenes/IntroScene';
import { MenuScene } from '@/scenes/MenuScene';
import { HubScene } from '@/scenes/HubScene';
import { ChapterSelectScene } from '@/scenes/ChapterSelectScene';
import { GameScene } from '@/scenes/GameScene';
import { ResultScene } from '@/scenes/ResultScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b0f1a',
  width: GameConfig.logicalWidth,
  height: GameConfig.logicalHeight,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, IntroScene, MenuScene, HubScene, ChapterSelectScene, GameScene, ResultScene],
};

const game = new Phaser.Game(config);

(window as unknown as { __GAME__?: Phaser.Game }).__GAME__ = game;

export default game;
