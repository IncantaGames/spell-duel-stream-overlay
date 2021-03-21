import Phaser from "phaser";
import { SpellType } from "./spell-type";
import { Spell } from "./spell";

export class Player {
  public id: number;
  public spellType: SpellType;
  public sprite: Phaser.GameObjects.Sprite | null;
  private attacking: boolean = false;

  constructor(id: number) {
    this.id = id;
    this.spellType = SpellType.Air;
    this.sprite = null;
  }

  initializeAnimations() {
    const scene = this.sprite!.scene;
    this.sprite!.anims.create({
      key: "attack-1",
      frames: scene.anims.generateFrameNumbers("wizard-attack-1", { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1
    });
    this.sprite!.anims.create({
      key: "attack-2",
      frames: scene.anims.generateFrameNumbers("wizard-attack-2", { start: 0, end: 7 }),
      frameRate: 10,
      repeat: 0
    });
    this.sprite!.anims.create({
      key: "death",
      frames: scene.anims.generateFrameNumbers("wizard-death", { start: 0, end: 6 }),
      frameRate: 10,
      repeat: 0
    });
    this.sprite!.anims.create({
      key: "fall",
      frames: scene.anims.generateFrameNumbers("wizard-fall", { start: 0, end: 1 }),
      frameRate: 10,
      repeat: 0
    });
    this.sprite!.anims.create({
      key: "hit",
      frames: scene.anims.generateFrameNumbers("wizard-hit", { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });
    this.sprite!.anims.create({
      key: "idle",
      frames: scene.anims.generateFrameNumbers("wizard-idle", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1
    });
    this.sprite!.anims.create({
      key: "jump",
      frames: scene.anims.generateFrameNumbers("wizard-jump", { start: 0, end: 1 }),
      frameRate: 10,
      repeat: -1
    });
    this.sprite!.anims.create({
      key: "run",
      frames: scene.anims.generateFrameNumbers("wizard-run", { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1
    });
  }

  initialize(x: number, y: number, physics: Phaser.Physics.Arcade.ArcadePhysics) {
    this.sprite = physics.add.staticSprite(x, y, "wizard-idle");
    this.sprite.setInteractive();
    // this.sprite.input.hitArea.setTo(82, 55, 57, 86); // TODO: no idea how to minimize collision

    this.initializeAnimations();
  }

  spellHitHandler(spell: Spell, otherPlayer: Player) {
    this.sprite?.removeAllListeners();
    otherPlayer.die();
    spell.sprite?.destroy();
  }

  idle() {
    this.sprite!.play("idle");
  }

  die() {
    if (this.sprite) {
      this.sprite.once("animationcomplete", () => {
        this.sprite!.destroy();
      });
      this.sprite.play("death");
    }
  }

  attack(otherPlayer?: Player) {
    if (!this.attacking) {
      this.attacking = true;
      this.sprite!.play("attack-2");
      const attackListener = (
        animation: Phaser.Animations.Animation,
        frame: Phaser.Animations.AnimationFrame,
        gameObject: Phaser.GameObjects.Sprite,
        frameKey: string
      ) => {
        if (frame.index === 4) {
          const spell = new Spell(this.spellType);
          spell.sprite = this.sprite!.scene.physics.add.sprite(
            this.sprite!.x + 50,
            this.sprite!.y - 17,
            "pink-helix"
          );
          if (otherPlayer?.sprite) {
            spell.sprite.scene.physics.add.collider(
              spell.sprite,
              otherPlayer.sprite,
              () => {
                this.spellHitHandler(spell, otherPlayer);
              },
              undefined,
              this
            );
          }
          spell.sprite.setFlipX(true);
          spell.sprite.body.velocity.x = 250;
          spell.initializeAnimations();
          spell.start();
        }
      };
      this.sprite!.on("animationupdate", attackListener);
      this.sprite!.once("animationcomplete", () => {
        this.sprite!.removeListener("animationupdate", attackListener);
        this.attacking = false;
        this.sprite!.play("idle");
      });
    }
  }
}
