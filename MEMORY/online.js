// online.js - FULL Multiplayer Logic using Socket.io (Updated with loading screen + name before room)

const socket = io("https://memorygame-server.onrender.com");
let playerName = "";
let roomCode = "";
let isMyTurn = false;
let matchedPairs = 0;
let flippedCards = [];
let gameStarted = false;
let totalPairs = 12;

const gameBoard = document.getElementById("gameBoard");
const player1Display = document.getElementById("player1Name");
const player2Display = document.getElementById("player2Name");
const player1ScoreEl = document.getElementById("player1Score");
const player2ScoreEl = document.getElementById("player2Score");
const statusText = document.getElementById("statusText");
const popup = document.getElementById("popup");
const popupMessage = document.getElementById("popupMessage");
const loadingScreen = document.getElementById("loadingScreen");
const mainUI = document.getElementById("mainUI");

let playerScores = { me: 0, opponent: 0 };

window.onload = () => {
  setTimeout(() => {
    loadingScreen.style.display = "none";
    mainUI.style.display = "block";

    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room) {
      document.getElementById("roomCodeInput").value = room;
    }
  }, 2000);
};

function createRoom() {
  playerName = document.getElementById("playerNameInput").value.trim();
  if (!playerName) return alert("Please enter your name");
  roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  socket.emit("createRoom", { roomCode, name: playerName });
  enterGameRoom();
  generateQR(roomCode);
}

function joinRoom() {
  playerName = document.getElementById("playerNameInput").value.trim();
  if (!playerName) return alert("Please enter your name");
  const input = document.getElementById("roomCodeInput").value.trim();
  if (!input) return alert("Enter a valid room code.");
  roomCode = input.toUpperCase();
  socket.emit("joinRoom", { roomCode, name: playerName });
  enterGameRoom();
}

function enterGameRoom() {
  document.getElementById("roomSection").style.display = "none";
  document.getElementById("onlineGame").style.display = "block";
  statusText.textContent = `Room: ${roomCode}`;
}

socket.on("startGame", ({ players, firstTurn, icons }) => {
  gameStarted = true;
  isMyTurn = players[0] === playerName;
  player1Display.textContent = players[0];
  player2Display.textContent = players[1];
  statusText.textContent = isMyTurn ? "Your Turn" : "Opponent's Turn";
  renderGameBoard(icons);
});

function renderGameBoard(icons) {
  const cards = icons;
  gameBoard.innerHTML = "";
  gameBoard.style.gridTemplateColumns = "repeat(6, 1fr)";
  cards.forEach((icon, index) => {
    const card = document.createElement("div");
    card.classList.add("card");
    card.dataset.icon = icon;
    card.dataset.index = index;
    card.textContent = "";
    card.addEventListener("click", () => handleCardClick(card));
    gameBoard.appendChild(card);
  });
}

function handleCardClick(card) {
  if (!isMyTurn || card.classList.contains("flipped") || card.classList.contains("matched")) return;
  flipCard(card);
  flippedCards.push(card);
  socket.emit("flipCard", { roomCode, index: card.dataset.index });

  if (flippedCards.length === 2) {
    const [c1, c2] = flippedCards;
    if (c1.dataset.icon === c2.dataset.icon) {
      markMatched(c1, c2);
      playerScores.me++;
      player1ScoreEl.textContent = playerScores.me;
      socket.emit("matchFound", { roomCode, indexes: [c1.dataset.index, c2.dataset.index] });
      flippedCards = [];
      matchedPairs++;
      if (matchedPairs === totalPairs) {
        endGame();
      }
    } else {
      setTimeout(() => {
        unflipCards(c1, c2);
        flippedCards = [];
        isMyTurn = false;
        statusText.textContent = "Opponent's Turn";
        socket.emit("switchTurn", roomCode);
        socket.emit("unflipOpponent", {
          roomCode,
          indexes: [c1.dataset.index, c2.dataset.index]
        });
      }, 1000);
    }
  }
}

function endGame() {
  const myScore = playerScores.me;
  const opponentScore = playerScores.opponent;
  let message = "It's a Tie!";
  if (myScore > opponentScore) message = "🎉 You Win!";
  else if (myScore < opponentScore) message = "❌ You Lose!";

  popupMessage.textContent = message;
  popup.style.display = "block";
}

function flipCard(card) {
  card.classList.add("flipped");
  card.textContent = card.dataset.icon;
}

function unflipCards(c1, c2) {
  c1.classList.remove("flipped");
  c1.textContent = "";
  c2.classList.remove("flipped");
  c2.textContent = "";
}

function markMatched(c1, c2) {
  c1.classList.add("matched");
  c2.classList.add("matched");
}

function resetGame() {
  popup.style.display = "none";
  matchedPairs = 0;
  playerScores = { me: 0, opponent: 0 };
  player1ScoreEl.textContent = 0;
  player2ScoreEl.textContent = 0;
  flippedCards = [];
  socket.emit("restartGame", roomCode);
}

function quitGame() {
  window.location.href = "index.html";
}

socket.on("opponentFlip", (index) => {
  const card = document.querySelector(`.card[data-index='${index}']`);
  flipCard(card);
});

socket.on("opponentMatch", (indexes) => {
  indexes.forEach(i => {
    const card = document.querySelector(`.card[data-index='${i}']`);
    card.classList.add("matched");
  });
  playerScores.opponent++;
  player2ScoreEl.textContent = playerScores.opponent;
});

socket.on("yourTurn", () => {
  isMyTurn = true;
  statusText.textContent = "Your Turn";
});

socket.on("unflipCards", (indexes) => {
  const [i1, i2] = indexes;
  const c1 = document.querySelector(`.card[data-index='${i1}']`);
  const c2 = document.querySelector(`.card[data-index='${i2}']`);
  unflipCards(c1, c2);
});

function shuffle(arr) {
  const shuffled = [...arr, ...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateQR(roomCode) {
  const url = `${window.location.origin}/online.html?room=${roomCode}`;
  document.getElementById("qrcodeBox").style.display = "block";
  QRCode.toCanvas(document.getElementById("qrcode"), url, { width: 180 }, function (error) {
    if (error) console.error(error);
  });
}