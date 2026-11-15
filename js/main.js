import {
    checkCredentials,
    createGame,
    createMeld,
    discardCard,
    displayHand,
    drawCard,
    drawFromDiscardPile,
    fetchGameState,
    getCardImagePath,
    getSelectedCards,
    joinGame,
    setCredentials,
    takeBackMeld
} from "./app.js";

const loginScreen = document.getElementById("login-screen");
const loginForm = document.getElementById("login-form");
const passwordInput = document.getElementById("access-password");
const loginError = document.getElementById("login-error");
const loginButton = document.getElementById("login-button");
const roomSelection = document.getElementById("room-selection");
const createRoom = document.getElementById("create-game-button");
const joinGameForm = document.getElementById("join-game-form");
const gameCodeInput = document.getElementById("game-code-input");
const roomError = document.getElementById("room-error");
const gameScreen = document.getElementById("game-screen");
const createGameButton = document.getElementById("create-game-button");
const cardContainer = document.getElementById("card-container");
const stockPile = document.getElementById("stock-pile");
const stockCount = document.getElementById("stock-count");
const discardPosso = document.getElementById("discard-posso");
const discardCount = document.getElementById("discard-count")
const discardButton = document.getElementById("discard-button");
const turnIndicator = document.getElementById("turn-indicator");
const playerMeldsContainer = document.getElementById("player-melds");
const opponentMeldsContainer = document.getElementById("opponent-melds");
const meldButton = document.getElementById("meld-button");
const takeBackButton = document.getElementById("take-back-button");

let currentPlayerNumber = null;
let playerHand = [];
let currentGameState = null;
let selectedMeldIndex = null;

loginForm.addEventListener("submit", async (e) => {

    // Prevents the browser from reloading the page when the form is submitted
    e.preventDefault();

    const password = passwordInput.value;
    setCredentials(password);

    loginButton.disabled = true;
    loginButton.textContent = "Überprüfe Passowort...";
    loginError.hidden = true;

    const validCredentials = await checkCredentials();

    if (!validCredentials) {
        loginError.textContent = "Falsches Password oder Server nicht erreichbar";
        loginError.hidden = false;

        passwordInput.value = "";
        passwordInput.focus();

        loginButton.disabled = false;
        loginButton.textContent = "Weiter";
        return;
    }

    loginForm.hidden = true;
    roomSelection.hidden = false;
})


createGameButton.addEventListener("click", async () => {
    createGameButton.disabled = true;
    roomError.hidden = true;

    const access = await createGame();

    if (!access) {
        roomError.textContent = "Could not create game.";
        roomError.hidden = false;
        createGameButton.disabled = false;
        return;
    }

    currentPlayerNumber = access.playerNumber;

    alert(`Your game code is: ${access.gameCode}`);

    loginScreen.hidden = true;
    gameScreen.hidden = false;

    initializeGame(access.gameState);
})


joinGameForm.addEventListener("submit", async (e) => {

    console.log("Join Game button submitted!");

    e.preventDefault();

    const code = gameCodeInput.value.trim().toUpperCase();

    roomError.hidden = true;

    const access = await joinGame(code);

    console.log("Join response:", access);

    if (!access) {
        roomError.textContent = "Could not join a game. Check the game code.";
        roomError.hidden = false;
        return;
    }

    currentPlayerNumber = access.playerNumber;

    loginScreen.hidden = true;
    gameScreen.hidden = false;

    initializeGame(access.gameState);
})


function initializeGame(gameState) {

    currentGameState = gameState;
    console.log("Initial game state:", gameState);

    const ownHand = gameState.hand;

    playerHand = [...ownHand];

    displayHand(playerHand, cardContainer);

    stockCount.textContent = `${gameState.stockSize} Karten`;

    updateDiscardPile(gameState);
    updateTurnIndicator(gameState);
    displayMelds(gameState);

    setInterval(refreshGame, 1000)
}

function updateDiscardPile(gameState) {

    const topCard = gameState.topDiscardCard;

    if (topCard) {
        discardPosso.src = getCardImagePath(topCard);
        discardPosso.alt = `${topCard.rank} of ${topCard.suit}`;
    } else {
        discardPosso.src = "./assets/cards/CARD_BACK.svg";
        discardPosso.alt = "Empty discard pile";
    }

    if (gameState.discardSize === 1) {
        discardCount.textContent = `${gameState.discardSize} Karte`;
    } else {
        discardCount.textContent = `${gameState.discardSize} Karten`;
    }
}

function displayMelds(gameState) {

    // Clear both areas before displaying the latest melds
    playerMeldsContainer.innerHTML = "";
    opponentMeldsContainer.innerHTML = "";

    // Determine which melds belong to us and which to our opponent
    const ownMelds = currentPlayerNumber === 1
        ? gameState.player1Melds
        : gameState.player2Melds;
    const opponentsMelds = currentPlayerNumber === 1
        ? gameState.player2Melds
        : gameState.player1Melds

    // Display our own melds
    ownMelds.forEach((meld, index) => {

        const meldGroup = document.createElement("div");
        meldGroup.classList.add("meld-group");

        // Remember which meld this element represents
        meldGroup.dataset.meldIndex = index;

        if (selectedMeldIndex === index) {
            meldGroup.classList.add("selected-meld");
        }

        // Display every card in this meld
        meld.forEach(card => {

            const image = document.createElement("img");
            image.src = getCardImagePath(card);
            image.alt = `${card.rank} of ${card.suit}`;

            meldGroup.appendChild(image);
        });

        // Select this meld when clicked
        meldGroup.addEventListener("click", () => {

            selectedMeldIndex = index;

            // Remove previous selection
            document.querySelectorAll("#player-melds .meld-group")
                .forEach(group => group.classList.remove("selected-meld"));

            // Highlight the selected meld
            meldGroup.classList.add("selected-meld");
        });

        playerMeldsContainer.appendChild(meldGroup);
    });

    // Display the opponent's meld
    opponentsMelds.forEach(meld => {

        const meldGroup = document.createElement("div");
        meldGroup.classList.add("meld-group");

        meld.forEach(card => {

            const image = document.createElement("img");
            image.src = getCardImagePath(card);
            image.alt = `${card.rank} of ${card.suit}`;

            meldGroup.appendChild(image);
        });

        opponentMeldsContainer.appendChild(meldGroup);
    });
}

function updateTurnIndicator(gameState) {

    const isMyTurn = gameState.currentPlayer === `Player ${currentPlayerNumber}`;

    turnIndicator.textContent = isMyTurn ? "Du bist am Zug" : "Gegner ist am Zug";
}

stockPile.addEventListener("click", async () => {

    // Check whose turn it is
    if (currentGameState.currentPlayer !== `Player ${currentPlayerNumber}`) {
        console.log("It is not your turn!");
        return;
    }

    const gameState = await drawCard();

    if (!gameState) {
        return;
    }

    const ownHand = gameState.hand;

    playerHand = [...ownHand];

    displayHand(playerHand, cardContainer);
    stockCount.textContent = `${gameState.stockSize} Karten`;

    console.log("Card drawn successfully!");
});

discardPosso.addEventListener("click", async () => {

    // Check whose turn it is
    if (currentGameState.currentPlayer !== `Player ${currentPlayerNumber}`) {
        return;
    }

    // Only allow picking up the discard pile during DRAW pahse
    if (currentGameState.phase !== "DRAW") {
        return;
    }

    // Check if the discard pile is empty
    if (currentGameState.discardSize === 0) {
        return;
    }

    // Ask for confirmation
    const confirmed = confirm("Willst du den Posso aufnehmen? Ja/Nein");

    if (!confirmed) {
        return;
    }

    // Pick up the entire discard pile
    const gameState = await drawFromDiscardPile();

    if (!gameState) {
        return;
    }

    // Update the game state
    currentGameState = gameState;

    // Update your hand
    playerHand = [...gameState.hand];
    displayHand(playerHand, cardContainer);

    // Update the discard pie and other information
    updateDiscardPile(gameState);
    updateTurnIndicator(gameState);

    console.log("Discard pile picked up successfully!")
})


discardButton.addEventListener("click", async () => {

    const selectedCards = getSelectedCards(cardContainer, playerHand);

    if (selectedCards.length !== 1) {
        alert("Please select exactly one card to discard");
        return;
    }

    const selectedCard = selectedCards[0];
    const gameState = await discardCard(selectedCard.id);

    if (!gameState) {
        return;
    }

    // The spread operator ... copies the cards from gameState.player1Hand into a new array.
    // Why? Because Java has already removed the discarded card -> So redrawing the hand
    playerHand = [...gameState.hand]
    displayHand(playerHand, cardContainer);
    updateDiscardPile(gameState);
    console.log("Card discarded successfully!")
})

meldButton.addEventListener("click", async () => {

    //Check whose turn it is
    if (currentGameState.currentPlayer !== `Player ${currentPlayerNumber}`) {
        alert("It is not your turn!");
        return;
    }

    // Get the selected cards from our hand
    const selectedCards = getSelectedCards(cardContainer, playerHand);

    if (selectedCards.length === 0) {
        alert("Please select at least one card.");
        return;
    }

    // Get the IDs of the selected cards
    const cardIds = selectedCards.map(card => card.id);

    // Create a new meld or add cards to an existing meld
    const gameState = await createMeld(cardIds, selectedMeldIndex);

    if (!gameState) {
        return;
    }

    // Update our hand
    playerHand = [...gameState.hand];

    displayHand(playerHand, cardContainer);

    // Update the game state and melds
    currentGameState = gameState;
    displayMelds(gameState);

    // Reset the selected meld
    selectedMeldIndex = null;

    console.log("Meld created successfully!");
})

takeBackButton.addEventListener("click", async () => {

    // Check whose turn it is
    if (currentGameState.currentPlayer !== `Player ${currentPlayerNumber}`) {
        alert("It is not your turn!");
        return;
    }

    // Check whether a meld is selected
    if (selectedMeldIndex === null) {
        alert("Please select a meld first.");
        return;
    }

    // Take the selected meld back
    const gameState = await takeBackMeld(selectedMeldIndex);

    if (!gameState) {
        return;
    }

    // Update our hand
    playerHand = [...gameState.hand];

    displayHand(playerHand, cardContainer);

    // Update the game state and melds
    currentGameState = gameState;
    displayMelds(gameState);

    // Reset the selected meld
    selectedMeldIndex = null;

    console.log("Meld taken back successfully!")
})

async function refreshGame() {

    const gameState = await fetchGameState();
    console.log("Refreshed game state:", gameState);

    if (!gameState) {
        return;
    }

    currentGameState = gameState;

    const ownHand = gameState.hand;
    const currentIds = playerHand.map(card => card.id).sort();
    const updatedIds = ownHand.map(card => card.id).sort();

    if (JSON.stringify(currentIds) !== JSON.stringify(updatedIds)) {
        playerHand = [...ownHand];
        displayHand(playerHand, cardContainer);
    }

    stockCount.textContent = `${gameState.stockSize} Karten`;
    updateDiscardPile(gameState);
    updateTurnIndicator(gameState);
    displayMelds(gameState);
}