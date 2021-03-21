import config from "config";
import { Sema } from "async-sema";
import { Duel, RoundStatus, PlayerAction } from "./duel";

export class DuelPool {
  public accepting: boolean;
  public currentDuel: Duel | null;
  public acceptingEndsAt: Date;
  public finished: boolean;
  public duelNumber: number;

  private players: string[];
  private playerLock: Sema;

  get numInPool() {
    return this.players.length;
  }

  get playersInPool() {
    return this.players;
  }

  constructor() {
    this.accepting = true;
    this.players = [];
    this.currentDuel = null;
    this.playerLock = new Sema(1);
    this.finished = false;
    this.duelNumber = 0;

    this.acceptingEndsAt = new Date(
      Date.now() + config.get<number>("duel.join-time-ms")
    );
    
    setTimeout(() => {
      // finish duel pool collection
      this.accepting = false;

      // start duels
      this.getNewDuel();
    }, config.get<number>("duel.join-time-ms"));
  }

  async playerJoin(player: string) {
    if (!this.players.includes(player)) {
      await this.playerLock.acquire();

      this.players.push(player);

      this.playerLock.release();
    }
  }

  async pickPlayer(): Promise<string | null> {
    await this.playerLock.acquire();

    const player = this.numInPool > 0 ? this.players.shift()! : null;

    this.playerLock.release();

    return player;
  }

  async getNewDuel(): Promise<boolean> {
    if (this.numInPool >= 2) {
      const duelPlayer1 = await this.pickPlayer();
      const duelPlayer2 = await this.pickPlayer();
      if (duelPlayer1 && duelPlayer2) {
        this.currentDuel = new Duel(duelPlayer1, duelPlayer2);
        this.duelNumber++;
        return true;
      }
    }

    this.finishPool();
    return false;
  }

  async playerCancel(player: string) {
    if (this.currentDuel?.player1.name === player) {
      if (this.currentDuel.lastRoundStatus === RoundStatus.Waiting) {
        // pick new player
        if (this.numInPool >= 1) {
          const newPlayer = await this.pickPlayer();
          this.currentDuel.player1 = {
            id: newPlayer!,
            name: newPlayer!,
            ready: false,
            action: PlayerAction.Unknown,
            poweredUp: false,
            lastRoundAction: PlayerAction.Unknown
          };
        } else {
          // no players left in pool player 2 wins by forfeit
          this.currentDuel.lastRoundStatus = RoundStatus.Player2Won;
          await this.finishPool();
        }
      } else {
        // someone left mid duel? player 2 wins by forfeit
        this.currentDuel.lastRoundStatus = RoundStatus.Player2Won;
      }
      
      return;
    } else if (this.currentDuel?.player2.name === player) {
      if (this.currentDuel.lastRoundStatus === RoundStatus.Waiting) {
        // pick new player
        if (this.numInPool >= 1) {
          const newPlayer = await this.pickPlayer();
          this.currentDuel.player2 = {
            id: newPlayer!,
            name: newPlayer!,
            ready: false,
            action: PlayerAction.Unknown,
            poweredUp: false,
            lastRoundAction: PlayerAction.Unknown
          };
        } else {
          // no players left in pool player 1 wins by forfeit
          this.currentDuel.lastRoundStatus = RoundStatus.Player1Won;
          await this.finishPool();
        }
      } else {
        // someone left mid duel? player 1 wins by forfeit
        this.currentDuel.lastRoundStatus = RoundStatus.Player1Won;
      }
      
      return;
    }

    const idx = this.players.findIndex(p => p === player);

    if (idx >= 0) {
      // player doesn't want to be in the pool anymore
      await this.playerLock.acquire();

      this.players.splice(idx, 1);

      this.playerLock.release();
    }
  }

  public async setAction(playerName: string, action: PlayerAction) {
    const roundStatus = this.currentDuel?.setAction(playerName, action);

    switch (roundStatus) {
      case RoundStatus.Player1Won: {
        // send winner
        await this.getNewDuel();
        break;
      }
      case RoundStatus.Player2Won: {
        // send winner
        await this.getNewDuel();
        break;
      }
      case RoundStatus.BothDead: {
        // send that both lost
        await this.getNewDuel();
        break;
      }
      case RoundStatus.BothAlive: {
        // send that both lived
        break;
      }
      case RoundStatus.Stalemate: {
        // send stalemate
        await this.getNewDuel();
        break;
      }
    }
  }

  async finishPool() {
    this.finished = true;
    this.currentDuel = null;
    this.players = [];
  }
}
