import Phaser from "phaser";
import { DuelScene } from "./scenes/duel-scene";

class SimpleGame {
  static WIDTH = 800;
  static HEIGHT = 600;

  public game: Phaser.Game;

  constructor() {
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      width: SimpleGame.WIDTH,
      height: SimpleGame.HEIGHT,
      backgroundColor: "#18216D",
      scene: [DuelScene],
      physics: {
        default: "arcade",
        arcade: {
          debug: false
        }
      },
    });
  }
}

window.onload = () => {
  const game = new SimpleGame();
};