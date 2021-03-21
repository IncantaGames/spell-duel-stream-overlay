import axios from "axios";
import config from "config";
import jsonwebtoken from "jsonwebtoken";
import { PlayerAction, RoundStatus } from "./duel";
import { DuelPool } from "./duel-pool";

export enum DuelStatus {
  Inactive = 0,
  Picking = 1,
  RoundResult = 2,
  MatchResult = 3
}

interface IPlayer {
  id: string;
  name: string | null;
  lastRoundAction: PlayerAction;
  ready: boolean;
}

export interface IDuelState {
  number: number;
  status: DuelStatus;
  player1: IPlayer | null;
  player2: IPlayer | null;
  round: number;
  secondsLeft: number;
  lastRoundStatus: RoundStatus;
}

export enum ServerStatus {
  Idle = 0,
  CanJoin = 1,
  Executing = 2
}

export interface IState {
  status: ServerStatus,
  playersInPool: string[],
  duel: IDuelState
}

export function GetState(duelPool: DuelPool | null): IState {
  if (duelPool === null) {
    return {
      status: ServerStatus.Idle,
      playersInPool: [],
      duel: {
        number: 0,
        status: DuelStatus.Inactive,
        player1: null,
        player2: null,
        round: 0,
        secondsLeft: 0,
        lastRoundStatus: RoundStatus.Waiting
      }
    };
  } else if (duelPool.currentDuel === null) {
    return {
      status: duelPool.accepting ? ServerStatus.CanJoin : ServerStatus.Executing,
      playersInPool: duelPool.playersInPool,
      duel: {
        number: duelPool.duelNumber,
        status: DuelStatus.Inactive,
        player1: null,
        player2: null,
        round: 0,
        secondsLeft: duelPool.accepting ?
          Math.floor((duelPool.acceptingEndsAt.getTime() - Date.now()) / 1000) :
          ServerStatus.Executing,
        lastRoundStatus: RoundStatus.Waiting
      }
    };
  } else {
    const duel = duelPool.currentDuel;
    return {
      status: ServerStatus.Executing,
      playersInPool: duelPool.playersInPool,
      duel: {
        number: duelPool.duelNumber,
        status: DuelStatus.Picking, // TODO
        player1: {
          id: duel.player1.id,
          name: duel.player1.name,
          lastRoundAction: duel.player1.lastRoundAction,
          ready: duel.player1.action !== PlayerAction.Unknown,
        },
        player2: {
          id: duel.player2.id,
          name: duel.player2.name,
          lastRoundAction: duel.player2.lastRoundAction,
          ready: duel.player2.action !== PlayerAction.Unknown,
        },
        round: duel.round,
        secondsLeft: Math.floor((duel.roundOverAt.getTime() - Date.now()) / 1000),
        lastRoundStatus: RoundStatus.Waiting
      }
    };
  }
}

export async function BroadcastState(duelPool: DuelPool | null) {
  const channelId = config.get<string>("twitch.channel-id");

  // Set the HTTP headers required by the Twitch API.
  const headers = {
    'Client-ID': config.get<string>("twitch.client-id"),
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${makeServerToken(channelId)}`,
  };

  const body = {
    content_type: "application/json",
    message: JSON.stringify(GetState(duelPool)),
    targets: [ "broadcast" ]
  };

  // Send the broadcast request to the Twitch API.
  const result = await axios.request({
    url: `https://api.twitch.tv/extensions/message/${channelId}`,
    method: "post",
    headers,
    data: JSON.stringify(body),
  });
}

function makeServerToken(channelId: string) {
  const payload = {
    exp: Math.floor(Date.now() / 1000) + config.get<number>("twitch.server-token-duration-s"),
    channel_id: channelId,
    user_id: config.get<string>("twitch.owner-id"),
    role: "external",
    pubsub_perms: {
      send: ["*"],
    },
  };

  return jsonwebtoken.sign(
    payload,
    Buffer.from(config.get<string>("twitch.client-secret"), "base64"),
    { algorithm: "HS256" }
  );
}
