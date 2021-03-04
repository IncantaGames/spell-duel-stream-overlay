import Phaser from "phaser";
import { GameScene } from "./game-scene";

class SimpleGame {
  public game: Phaser.Game;

  constructor() {
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      backgroundColor: "#18216D",
      scene: [GameScene],
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