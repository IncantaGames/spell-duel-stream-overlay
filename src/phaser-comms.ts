import EventEmitter from "events";

export function GetWebsocketHandlerForPhaser(emitter: EventEmitter) {
  return (ws: WebSocket) => {
    // send each client the updated game state
    // clients here are people that are on the
    // phaser page, which is mainly just idling
    // we replicate state by telling the phaser
    // client to render the action
    // in actuality, there likely will only be 1 client,
    // but there's no reason multiple people couldn't
    // watch the game from any source
  
    emitter.on("cast", data => {
      ws.send(JSON.stringify({
        action: "cast",
      }));
    });
  
    emitter.on("initialize-duel", data => {
      ws.send(JSON.stringify({
        action: "initialize-duel",
        players: data.players,
      }));
    });
  
    emitter.on("spell-selection", data => {
      ws.send(JSON.stringify({
        action: "spell-selection",
        player: data.playerId, // todo
        spellType: data.spellType,
      }));
    });
  
    emitter.on("start-duel", data => {
      ws.send(JSON.stringify({
        action: "start-duel",
      }));
    });
  }
}