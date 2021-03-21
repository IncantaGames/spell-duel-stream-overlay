let token = "";
let tuid = "";

// const backendUrl = "https://localhost:8080";
const backendUrl = "https://overlay.incanta.games";

// because who wants to type this every time?
const twitch = window.Twitch.ext;

// create the request options for our Twitch API calls
const requests = {
  cast: createRequest("POST", "cast"),
  setSpell: createRequest("POST", "set-spell"),
  startDuelPool: createRequest("POST", "start-pool"),
  joinDuelPool: createRequest("POST", "join-duel-pool")
};

const Status = {
  Idle: 0,
  CanJoin: 1,
  Joined: 2,
  Waiting: 3,
  Watching: 4,
  WaitingForReadyUp: 5,
  WaitingForDuel: 6,
  WaitingForAction: 7,
  WaitingForResult: 8,
  DuelRoundResult: 9,
  DuelMatchResult: 10
}

const DuelStatus = {
  Inactive: 0,
  Picking: 1,
  RoundResult: 2,
  MatchResult: 3
}

const ServerStatus = {
  Idle: 0,
  CanJoin: 1,
  Executing: 2
};

let state = {
  status: Status.CanJoin,
  playersInPool: [],
  duel: {
    number: 0,
    status: DuelStatus.Inactive,
    player1: null,
    player2: null,
    round: 0,
    secondsLeft: 0,
    lastRoundStatus: 0,
  }
};

function createRequest(type, method) {
  return {
    type: type,
    url: `${backendUrl}/${method}`,
    success: () => twitch.rig.log(`successful ${backendUrl}/${method}`),
    error: logError
  }
}

function setAuth(token) {
  Object.keys(requests).forEach((req) => {
    twitch.rig.log("Setting auth headers");
    requests[req].headers = { "Authorization": `Bearer ${token}` }
  });
}

twitch.onContext(function (context) {
  twitch.rig.log(context);
});

twitch.onAuthorized(function (auth) {
  // save our credentials
  token = auth.token;
  tuid = auth.userId;
  console.log(auth);

  // enable the button
  $("#cast").removeAttr("disabled");

  setAuth(token);
  $.ajax(requests.get);
});

function logError(_, error, status) {
  twitch.rig.log("EBS request returned " + status + " (" + error + ")");
}

function logSuccess(hex, status) {
  // we could also use the output to update the block synchronously here,
  // but we want all views to get the same broadcast response at the same time.
  twitch.rig.log("EBS request returned " + hex + " (" + status + ")");
}

function startDuelPool() {
  if (!token) { return twitch.rig.log("Not authorized"); }
  $.ajax(requests.startDuelPool);
}

function joinDuelPool() {
  if (!token) { return twitch.rig.log("Not authorized"); }
  $.ajax(requests.joinDuelPool);
}

function renderState() {
  switch(state.status) {
    case Status.Idle: {
      $("#duel-start-button").show();
      $("#duel-join-button").hide();
      $("#joined-pool").hide();
      $("#watching").hide();
      $("#waiting").hide();
      $("#ready-up").hide();
      $("#waiting-for-duel").hide();
      $("#action").hide();
      $("#waiting-for-result").hide();
      break;
    }
    case Status.CanJoin: {
      $("#duel-start-button").hide();
      $("#duel-join-button").show();
      $("#joined-pool").hide();
      $("#watching").hide();
      $("#waiting").hide();
      $("#ready-up").hide();
      $("#waiting-for-duel").hide();
      $("#action").hide();
      $("#waiting-for-result").hide();

      $("#duel-join-button button").text(`Join Pool (${state.duel.secondsLeft} seconds left)`);
      break;
    }
    case Status.Joined: {
      $("#duel-start-button").hide();
      $("#duel-join-button").hide();
      $("#joined-pool").show();
      $("#watching").hide();
      $("#waiting").hide();
      $("#ready-up").hide();
      $("#waiting-for-duel").hide();
      $("#action").hide();
      $("#waiting-for-result").hide();

      $("#joined-pool span").text(`You're in the pool! ${state.duel.secondsLeft} seconds left until starting.`);
      break;
    }
    case Status.Watching: {
      $("#duel-start-button").hide();
      $("#duel-join-button").hide();
      $("#joined-pool").hide();
      $("#watching").show();
      $("#waiting").hide();
      $("#ready-up").hide();
      $("#waiting-for-duel").hide();
      $("#action").hide();
      $("#waiting-for-result").hide();

      $("#watching span").text(`Duel ${state.duel.number} of ${
        state.duel.number + state.playersInPool / 2
      }: ${state.duel.player1.name} vs ${state.duel.player2.name}!`);
      break;
    }
    case Status.Waiting: {
      $("#duel-start-button").hide();
      $("#duel-join-button").hide();
      $("#joined-pool").hide();
      $("#watching").hide();
      $("#waiting").show();
      $("#ready-up").hide();
      $("#waiting-for-duel").hide();
      $("#action").hide();
      $("#waiting-for-result").hide();

      playerPos = state.playersInPool.findIndex(p => p === tuid);
      $("#waiting span").text(`Duel ${state.duel.number} of ${
        state.duel.number + state.playersInPool / 2
      }: ${state.duel.player1.name} vs ${state.duel.player2.name}! ${
        playerPos >= 0 ?
        Math.floor(playerPos / 2) + 1 :
        "Unknown number of"
      } duel(s) until you're up!`);
      break;
    }
    case Status.WaitingForReadyUp: {
      $("#duel-start-button").hide();
      $("#duel-join-button").hide();
      $("#joined-pool").hide();
      $("#watching").hide();
      $("#waiting").hide();
      $("#ready-up").show();
      $("#waiting-for-duel").hide();
      $("#action").hide();
      $("#waiting-for-result").hide();

      $("#ready-up span").text(`It's your turn to duel! Press Ready Up in the next ${
        state.duel.secondsLeft
      } seconds to duel or forfeit your spot!`);
      break;
    }
    case Status.WaitingForDuel: {
      $("#duel-start-button").hide();
      $("#duel-join-button").hide();
      $("#joined-pool").hide();
      $("#watching").hide();
      $("#waiting").hide();
      $("#ready-up").hide();
      $("#waiting-for-duel").show();
      $("#action").hide();
      $("#waiting-for-result").hide();

      $("#waiting-for-duel span").text(`Waiting ${
        state.duel.secondsLeft
      } of seconds for other player to ready up before finding a new player!`);
      break;
    }
    case Status.WaitingForAction: {
      $("#duel-start-button").hide();
      $("#duel-join-button").hide();
      $("#joined-pool").hide();
      $("#watching").hide();
      $("#waiting").hide();
      $("#ready-up").hide();
      $("#waiting-for-duel").hide();
      $("#action").show();
      $("#waiting-for-result").hide();

      $("#action span").text(`Select an action in the next ${
        state.duel.secondsLeft
      } seconds or you'll forfeit!`);
      break;
    }
    case Status.WaitingForResult: {
      $("#duel-start-button").hide();
      $("#duel-join-button").hide();
      $("#joined-pool").hide();
      $("#watching").hide();
      $("#waiting").hide();
      $("#ready-up").hide();
      $("#waiting-for-duel").hide();
      $("#action").hide();
      $("#waiting-for-result").show();

      $("#waiting-for-result span").text(`Waiting ${
        state.duel.secondsLeft
      } seconds for the other play to select an action.`);
      break;
    }
  }
}

function getPlayerStatus(serverState) {
  if (serverState.status === 0) {
    // server is idling
    return Status.Idle;
  } else if (serverState.status === 1) {
    // server is in joining period; check if we joined
    if (serverState.playersInPool.includes(tuid)) {
      return Status.Joined;
    } else {
      return Status.CanJoin;
    }
  } else if (serverState.status === 2) {
    const isPlayer1 = serverState.duel.player1.id === tuid;
    const isPlayer2 = serverState.duel.player2.id === tuid;
    const isInDuel = isPlayer1 || isPlayer2;
    if (serverState.playersInPool.includes(tuid)) {
      // we're in the pool and waiting for our duel
      return Status.Waiting;
    } else if (isInDuel) {
      // we're in the current duel!
      // DuelPick: 7,
      if (serverState.duel.round === 0) {
        // we're in the ready up round
        if (
          (isPlayer1 && serverState.duel.player1.ready)
          (isPlayer2 && serverState.duel.player2.ready)
        ) {
          return Status.WaitingForDuel;
        } else {
          return Status.WaitingForReadyUp;
        }
      } else {
        if (
          (isPlayer1 && serverState.duel.player1.ready)
          (isPlayer2 && serverState.duel.player2.ready)
        ) {
          return Status.WaitingForResult;
        } else {
          return Status.WaitingForAction;
        }
      }
    } else {
      return Status.Watching;
    }
  }
}

$(function () {
  twitch.listen("broadcast", function (target, contentType, update) {
    // update from the server
    const serverState = JSON.parse(update);
    state = {
      ...serverState,
      status: getPlayerStatus(serverState)
    };
    renderState();
  });
});
