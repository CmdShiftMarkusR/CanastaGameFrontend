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
    startNewGame,
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
const newGameButton = document.getElementById("new-game-button");

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
    loginButton.textContent = "Überprüfe Passwort...";
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

    setInterval(refreshGame, 10000)
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

            // If this meld is already selected, unselect it
            if (selectedMeldIndex === index) {
                selectedMeldIndex = null;
                meldGroup.classList.remove("selected-meld");
                return;
            }
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

    currentGameState = gameState;

    updatePlayerHand(gameState.hand);

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
    updatePlayerHand(gameState.hand);

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

    currentGameState = gameState;

    updatePlayerHand(gameState.hand)
    updateDiscardPile(gameState);
    updateTurnIndicator(gameState);
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

    // Remeber the order of the cards that will remain in our hand
    const remainingCards = playerHand.filter(
        card => !cardIds.includes(card.id)
    );

    if (selectedMeldIndex !== null && selectedMeldIndex >= (
        currentPlayerNumber === 1
            ? currentGameState.player1Melds.length
            : currentGameState.player2Melds.length)
    ) {
        selectedMeldIndex = null;
    }

    // Create a new meld or add cards to an existing meld
    const gameState = await createMeld(cardIds, selectedMeldIndex);

    if (!gameState) {
        return;
    }

    // Preserve our manually sorted order
    playerHand = remainingCards;
    updatePlayerHand(gameState.hand);

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

    // Remember the cards already in our hand
    const existingCards = [...playerHand];

    // Find the cards returned by the backend
    const existingIds = existingCards.map(card => card.id);

    const returnedCards = gameState.hand.filter(
        card => !existingIds.includes(card.id)
    );

    // Keep the existing order and append the returned cards
    playerHand = [...existingCards, ...returnedCards];

    displayHand(playerHand, cardContainer);

    // Update the game state and melds
    currentGameState = gameState;
    displayMelds(gameState);

    // Reset the selected meld
    selectedMeldIndex = null;

    console.log("Meld taken back successfully!")
})

newGameButton.addEventListener("click", async () => {

    const confirmed = confirm("Willst du ein neues Spiel starten? Das aktuelle Spiel wird zurückgesetzt.");

    if (!confirmed) {
        return;
    }

    newGameButton.disabled = true;

    const gameState = await startNewGame();

    if (!gameState) {
        alert("Could not start a new game.");
        newGameButton.disabled = false;
        return;
    }

    // Update the game state
    currentGameState = gameState;

    // Update our new hand
    playerHand = [...gameState.hand];
    displayHand(playerHand, cardContainer);

    // Reset the selected meld
    selectedMeldIndex = null;

    // Update the other game elements
    stockCount.textContent = `${gameState.stockSize} Karten`;
    updateDiscardPile(gameState);
    updateTurnIndicator(gameState);
    displayMelds(gameState);

    newGameButton.disabled = false;

    console.log("New game started successfully!")
})

function updatePlayerHand(newHand) {

    const newCardsById = new Map(
        newHand.map(card => [card.id, card])
    );

    const currentIds = new Set(
        playerHand.map(card => card.id)
    );

    // Keep existing cards in their current order
    const existingCards = playerHand
        .filter(card => newCardsById.has(card.id))
        .map(card => newCardsById.get(card.id));

    // Find newly drawn or returned cards
    const addedCards = newHand.filter(
        card => !currentIds.has(card.id)
    );

    // The spread operator ... copies the cards
    playerHand = [...existingCards, ...addedCards];

    displayHand(playerHand, cardContainer);
}

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
        updatePlayerHand(ownHand)
    }

    stockCount.textContent = `${gameState.stockSize} Karten`;
    updateDiscardPile(gameState);
    updateTurnIndicator(gameState);
    displayMelds(gameState);
}