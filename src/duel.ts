import config from "config";

export enum PlayerAction {
  Unknown = 0,
  Shield = 1,
  Attack = 2,
  PowerUp = 3,
  Ready = 4
}

interface IPlayerState {
  id: string;
  name: string;
  ready: boolean;
  action: PlayerAction;
  poweredUp: boolean;
  lastRoundAction: PlayerAction;
}

export enum RoundStatus {
  Waiting,
  Player1Won,
  Player2Won,
  BothAlive,
  BothDead,
  Stalemate
}

export class Duel {
  public player1: IPlayerState;
  public player2: IPlayerState;
  public round: number;
  public lastRoundStatus: RoundStatus;
  public roundOverAt: Date;

  constructor(player1Name: string, player2Name: string) {
    this.player1 = {
      id: player1Name,
      name: player1Name,
      ready: false,
      action: PlayerAction.Unknown,
      poweredUp: false,
      lastRoundAction: PlayerAction.Unknown
    };

    this.player2 = {
      id: player2Name,
      name: player2Name,
      ready: false,
      action: PlayerAction.Unknown,
      poweredUp: false,
      lastRoundAction: PlayerAction.Unknown
    };

    this.round = 0;
    this.lastRoundStatus = RoundStatus.Waiting;
    this.roundOverAt = new Date(
      Date.now() + config.get<number>("duel.ready-up-time-ms")
    );
  }

  readyUp(playerName: string) {
    if (this.player1.name === playerName) {
      this.player1.ready = true;
      this.player1.action = PlayerAction.Ready;
    } else {
      this.player2.ready = true;
      this.player2.action = PlayerAction.Ready;
    }

    if (this.player1.ready && this.player2.ready) {
      this.round++;
      this.lastRoundStatus = RoundStatus.Waiting;
      this.player1.action = PlayerAction.Unknown;
      this.player2.action = PlayerAction.Unknown;
      this.roundOverAt = new Date(
        Date.now() + config.get<number>("duel.round-pick-time-ms")
      );
    }
  }

  setAction(playerName: string, action: PlayerAction): RoundStatus {
    if (this.player1.name === playerName) {
      this.player1.action = action;
    } else {
      this.player2.action = action;
    }

    if (
      this.player1.action !== PlayerAction.Unknown &&
      this.player2.action !== PlayerAction.Unknown
    ) {
      // execute round
      switch (this.player1.action) {
        case PlayerAction.Attack: {
          switch (this.player2.action) {
            case PlayerAction.Attack: {
              this.lastRoundStatus = RoundStatus.BothDead;
              break;
            }
            case PlayerAction.Shield: {
              if (this.player1.poweredUp) {
                this.lastRoundStatus = RoundStatus.Player1Won;
                break;
              } else {
                this.lastRoundStatus = RoundStatus.BothAlive;
                break;
              }
            }
            case PlayerAction.PowerUp: {
              this.lastRoundStatus = RoundStatus.Player1Won;
              break;
            }
          }
        }
        case PlayerAction.Shield: {
          switch (this.player2.action) {
            case PlayerAction.Attack: {
              if (this.player2.poweredUp) {
                this.lastRoundStatus = RoundStatus.Player2Won;
                break;
              } else {
                this.lastRoundStatus = RoundStatus.BothAlive;
                break;
              }
            }
            case PlayerAction.Shield: {
              this.lastRoundStatus = RoundStatus.BothAlive;
              break;
            }
            case PlayerAction.PowerUp: {
              this.player2.poweredUp = true;
              this.lastRoundStatus = RoundStatus.BothAlive;
              break;
            }
          }
        }
        case PlayerAction.PowerUp: {
          this.player1.poweredUp = true;
          switch (this.player2.action) {
            case PlayerAction.Attack: {
              this.lastRoundStatus = RoundStatus.Player2Won;
              break;
            }
            case PlayerAction.Shield: {
              this.lastRoundStatus = RoundStatus.BothAlive;
              break;
            }
            case PlayerAction.PowerUp: {
              this.lastRoundStatus = RoundStatus.BothAlive;
              break;
            }
          }
        }
      }

      this.player1.lastRoundAction = this.player1.action;
      this.player2.lastRoundAction = this.player2.action;
  
      // reset for next round
      this.round++;
      this.roundOverAt = new Date(
        Date.now() + config.get<number>("duel.round-pick-time-ms")
      );
      this.player1.action = PlayerAction.Unknown;
      this.player2.action = PlayerAction.Unknown;
  
      if (
        this.round > config.get<number>("duel.num-rounds") &&
        this.lastRoundStatus === RoundStatus.BothAlive
      ) {
        this.lastRoundStatus = RoundStatus.Stalemate;
      }
    } else {
      this.lastRoundStatus = RoundStatus.Waiting;
    }

    return this.lastRoundStatus;
  }
}
