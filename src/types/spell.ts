import Phaser from "phaser";
import { SpellType } from "./spell-type";

export class Spell {
  public type: SpellType;
  public sprite: Phaser.GameObjects.Sprite | null;

  constructor(type: SpellType) {
    this.type = type;
    this.sprite = null;
  }

  initializeAnimations() {
    const scene = this.sprite!.scene;
    this.sprite!.anims.create({
      key: "spell",
      frames: scene.anims.generateFrameNumbers("pink-helix", { start: 0, end: 59 }),
      frameRate: 30,
      repeat: -1
    });
  }

  start() {
    this.sprite!.play("spell");
  }
}
