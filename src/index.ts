import config from "config";
import express from "express";
import path from "path";
import https from "https";
import http from "http";
import fs from "fs";
import cors from "cors";
import WebSocket from "ws";
import EventEmitter from "events";
import jsonwebtoken from "jsonwebtoken";
import { DuelPool } from "./duel-pool";
import { BroadcastState } from "./state";
import { GetWebsocketHandlerForPhaser } from "./phaser-comms";

const app = express();
const emitter = new EventEmitter();

app.use(cors());

// Verify the header and the enclosed JWT.
function verifyAndDecode(header: string) {
  const bearerPrefix = "Bearer ";
  if (header.startsWith(bearerPrefix)) {
    try {
      const token = header.substring(bearerPrefix.length);
      return jsonwebtoken.verify(
        token,
        Buffer.from(config.get<string>("twitch.client-secret"), "base64"),
        { algorithms: ["HS256"] }
      );
    }
    catch (ex) {
      // throw Boom.unauthorized(STRINGS.invalidJwt);
    throw new Error("unauth");
    }
  }
  // throw Boom.unauthorized(STRINGS.invalidAuthHeader);
  throw new Error("unauth");
}

app.use("/app.js", express.static(path.join(__dirname, "..", "dist", "app.js")));

app.use("/media", express.static(path.join(__dirname, "..", "resources", "media")));

app.use("/", express.static(path.join(__dirname, "..", "resources", "twitch-extension")))

app.get("/app", function (req, res) {
  res.sendFile(path.join(__dirname, "..", "resources", "app.html"));
});

app.post("/cast", (req, res) => {
  const payload = verifyAndDecode(req.headers.authorization || "") as any;
  const { channel_id: channelId, opaque_user_id: opaqueUserId } = payload;
  emitter.emit("cast");
});

let duelPool: DuelPool | null = null;

function intervalBroadcast() {
  setTimeout(async () => {
    if (duelPool?.finished) {
      duelPool = null;
    }

    if (duelPool) {
      await duelPool.processTimeouts();
    }

    await BroadcastState(duelPool);
    intervalBroadcast();
  }, config.get<number>("twitch.broadcast-interval-ms"));
}

app.post("/start-pool", (req, res) => {
  if (duelPool === null) {
    duelPool = new DuelPool();
  }
});

app.post("/join-duel-pool", async (req, res) => {
  const payload = verifyAndDecode(req.headers.authorization || "") as any;
  const name = payload.opaque_user_id as string;

  if (duelPool?.accepting) {
    await duelPool.playerJoin(name);
  }
});

app.post("/ready-up", async (req, res) => {
  const payload = verifyAndDecode(req.headers.authorization || "") as any;
  const name = payload.opaque_user_id as string;

  if (duelPool?.currentDuel?.player1.name === name || duelPool?.currentDuel?.player2.name === name) {
    duelPool.currentDuel.readyUp(name);
  }
});

app.post("/set-action", (req, res) => {
  const payload = verifyAndDecode(req.headers.authorization || "") as any;
  const name = payload.opaque_user_id as string;
  const action = parseInt(req.body, 10);

  if (duelPool?.currentDuel?.player1.name === name || duelPool?.currentDuel?.player2.name === name) {
    duelPool.setAction(name, action);
  }
});

if (process.env.NODE_ENV !== "production") {
  // use self signed cert in dev

  const options = {
    key: fs.readFileSync(path.join(__dirname, "..", "conf", "server.key")),
    cert: fs.readFileSync(path.join(__dirname, "..", "conf", "server.crt"))
  };

  const server = https.createServer(options, app);

  const wss = new WebSocket.Server({ server });

  wss.on("connection", GetWebsocketHandlerForPhaser(emitter));

  server.listen(8080, () => {
    console.log("Server listening on https://localhost:8080");
  });
} else {
  // in prod, we use cloudflares cert, so http is fine

  const server = http.createServer(app);

  const wss = new WebSocket.Server({ server });

  wss.on("connection", GetWebsocketHandlerForPhaser(emitter));

  server.listen(8080, () => {
    console.log("Server listening on http://localhost:8080");
  });
}

// start sending updates to twitch
intervalBroadcast();
