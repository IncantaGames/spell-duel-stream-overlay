import Phaser from "phaser";
import { Player } from "../types/player";
import { SimpleGame } from "../app";

export class DuelScene extends Phaser.Scene {
  public sand: Phaser.Physics.Arcade.StaticGroup | null;

  private player1: Player | null;
  private player2: Player | null;

  constructor() {
    super({
      key: "DuelScene"
    });

    this.sand = null;
    this.player1 = null;
    this.player2 = null;
  }

  init(params: any): void {
  }

  preload(): void {
    // our assets
    this.load.setBaseURL("/media/");

    this.load.spritesheet("wizard-attack-1", "wizard/Attack1.png", { frameWidth: 231, frameHeight: 190 });
    this.load.spritesheet("wizard-attack-2", "wizard/Attack2.png", { frameWidth: 231, frameHeight: 190 });
    this.load.spritesheet("wizard-death", "wizard/Death.png", { frameWidth: 231, frameHeight: 190 });
    this.load.spritesheet("wizard-fall", "wizard/Fall.png", { frameWidth: 231, frameHeight: 190 });
    this.load.spritesheet("wizard-hit", "wizard/Hit.png", { frameWidth: 231, frameHeight: 190 });
    this.load.spritesheet("wizard-idle", "wizard/Idle.png", { frameWidth: 231, frameHeight: 190 });
    this.load.spritesheet("wizard-jump", "wizard/Jump.png", { frameWidth: 231, frameHeight: 190 });
    this.load.spritesheet("wizard-run", "wizard/Run.png", { frameWidth: 231, frameHeight: 190 });

    this.load.spritesheet("pink-helix", "spells/pink-helix.png", { frameWidth: 100, frameHeight: 100 });

    this.load.image("sand", "sand.jpg"); // TODO: replace with something else?
  }

  create(): void {
    this.sand = this.physics.add.staticGroup({
      key: "sand",
      frameQuantity: 20
    });

    Phaser.Actions.PlaceOnLine(
      this.sand.getChildren(),
      new Phaser.Geom.Line(20, 580, 820, 580)
    );

    this.sand.refresh();

    this.player1 = new Player(0);
    this.player1.initialize(50, 580-20-37/2, this.physics);
    this.player1.idle();

    this.player2 = new Player(1);
    this.player2.initialize(SimpleGame.WIDTH - 50, 580-20-37/2, this.physics);
    this.player2.sprite!.setFlipX(true);

    this.player2.idle();

    this.input.keyboard.on("keydown-A", () => {
      this.player1!.attack(this.player2!);
    });

    this.events.on("cast", () => {
      this.player1!.attack(this.player2!);
    });
  }

  update(time: number): void {
  }
};
