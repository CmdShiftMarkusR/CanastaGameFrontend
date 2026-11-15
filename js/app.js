const API_BASE_URL = "https://canasta-game-backend.onrender.com"

let authorizationHeader = null;
let gameCode = null;
let playerToken = null;
let playerNumber = null;

export function setCredentials(password) {
    const username = "player";
    const credentials = `${username}:${password}`;

    authorizationHeader = `Basic ${btoa(credentials)}`;
}

function getAuthHeaders() {
    return {
        "Authorization": authorizationHeader
    };
}

function getGameHeaders() {
    return {
        ...getAuthHeaders(),
        "X-Player-Token": playerToken
    };
}

function saveGameAccess(access) {
    gameCode = access.gameCode;
    playerToken = access.playerToken;
    playerNumber = access.playerNumber;
}

export async function checkCredentials() {
    try {
        // because hello can be retrieved with valid password
        const response = await fetch(`${API_BASE_URL}/api/hello`, {
            headers: getAuthHeaders()
        });

        return response.ok;

    } catch (error) {
        console.error("Error checking credentials:", error);
        return false;
    }
}

export async function createGame() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/games`, {
            method: "POST",
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error("Could not create game.");
        }

        const access = await response.json();
        saveGameAccess(access);
        return access;

    } catch (error) {
        console.error("Error creating game:", error);
        return null;
    }
}

export async function joinGame(code) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/games/${encodeURIComponent(code)}/join`, {
            method: "POST",
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error("Could not join a game.");
        }
        const access = await response.json();
        saveGameAccess(access);
        return access;

    } catch (error) {
        console.error("Error creating game:", error);
        return null;
    }
}


export function getCardImagePath(card) {
    if (!card || typeof card.rank !== "string" || typeof card.suit !== "string") {
        throw new Error("Invalid card.");
    }

    if (card.rank === "JOKER") {
        return "assets/cards/JOKER.svg";
    }

    return `assets/cards/${card.suit}_${card.rank}.svg`;
}

export function getCardBackImagePath() {
    return "assets/cards/CARD_BACK.svg";
}

export function displayCard(card, container, index) {
    const image = document.createElement("img");

    image.dataset.cardIndex = index;
    image.src = getCardImagePath(card);
    image.alt = `${card.rank} of ${card.suit}`;
    image.draggable = true;

    let dragStarted = false;

    image.addEventListener("click", () => {
        if (dragStarted) {
            dragStarted = false;
            return;
        }
        image.classList.toggle("selected");
    });

    // Detecting the drag
    image.addEventListener("dragstart", (event) => {
        dragStarted = true;

        event.dataTransfer.setData("text/plain", image.dataset.cardIndex);
        event.dataTransfer.effectAllowed = "move";
        image.classList.add("dragging");
    });

    image.addEventListener("dragend", (event) => {
        image.classList.remove("dragging");
        setTimeout(() => {
            dragStarted = false;
        }, 100);
    });

    image.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    });

    // Detecting where the card is dropped
    image.addEventListener("drop", (event) => {
        event.preventDefault();

        const fromIndex = Number(
            event.dataTransfer.getData("text/plain")
        );

        const toIndex = Number(image.dataset.cardIndex);

        if (fromIndex === toIndex) {
            return;
        }

        container.dispatchEvent(
            new CustomEvent("cardmove", {
                bubbles: false,
                detail: {fromIndex, toIndex}
            })
        );
    });
    container.appendChild(image);
}

export function displayHand(hand, container) {

    if (!Array.isArray(hand)) {
        console.error("displayHand expected an array:", hand);
        return;
    }

    //This clears the container before displaying card. So older cards don't remain
    container.innerHTML = "";

    if (hand.length === 0) {
        return;
    }

    const handWidth = container.clientWidth || 800;
    const cardWidth = Math.max(35, Math.min(90, handWidth / (hand.length * 0.45)));

    let spacingRatio;
    let maxAngle;
    let curveHeight;

    if (hand.length <= 2) {
        spacingRatio = 0.85;
    } else if (hand.length <= 5) {
        spacingRatio = 0.65;
    } else if (hand.length <= 8) {
        spacingRatio = 0.45;
    } else {
        spacingRatio = 0.30;
    }

    if (hand.length <= 2) {
        maxAngle = 8;
        curveHeight = 5;
    } else if (hand.length <= 5) {
        maxAngle = 15;
        curveHeight = 20;
    } else if (hand.length <= 8) {
        maxAngle = 25;
        curveHeight = 40;
    } else if (hand.length <= 15) {
        maxAngle = 30;
        curveHeight = 45;
    } else {
        maxAngle = 35;
        curveHeight = 70;
    }

    const spacing = cardWidth * spacingRatio;

    container.style.setProperty("--card-width", `${cardWidth}px`);

    hand.forEach((card, index) => {
        displayCard(card, container, index);

        const image = container.lastElementChild;
        const position = hand.length === 1 ? 0 : (index / (hand.length - 1)) * 2 - 1;
        const horizontalOffset = (index - (hand.length - 1) / 2) * spacing;
        const verticalOffset = curveHeight * position * position;
        const angle = position * maxAngle;

        image.style.left = `calc(50% + ${horizontalOffset}px)`;
        image.style.bottom = `${-verticalOffset + 130}px`;
        image.style.transform = `translateX(-50%) rotate(${angle}deg)`;
    });

    // Store the latest hand so the sorting listener always uses it
    container.currentHand = hand;

    if (container.dataset.cardMoveListenerAttached !== "true") {

        container.addEventListener("cardmove", (event) => {

            const currentHand = container.currentHand;
            const {fromIndex, toIndex} = event.detail;

            if (fromIndex < 0 || toIndex < 0 || fromIndex >= currentHand.length || toIndex >= currentHand.length) {
                return;
            }

            // Entfernt 1 Element aus Array an Stelle fromIndex
            const [movedCard] = currentHand.splice(fromIndex, 1);

            // Fügt element an toIndex ein, 0 Elemente werden entfernt, füge movedCard ein
            currentHand.splice(toIndex, 0, movedCard);

            // Container wird neu aufgebaut mit richtiger Kartenreihenfolge
            displayHand(currentHand, container);
        });
        container.dataset.cardMoveListenerAttached = "true";

    }

}

export function getSelectedCards(container, hand) {
    // Funktion bekommt Element "image" und wandelt String-Wert in Zahl um
    //Convert every found picture into an array and .map() processes each image individually
    // Reads card index and converts from string into number

    const selectedImages = container.querySelectorAll("img.selected");
    const selectedIndexes = Array.from(selectedImages).map(image =>
        Number(image.dataset.cardIndex)
    );

    return selectedIndexes.map(index => hand[index]);
}

export async function fetchGameState() {

    if (!gameCode || !playerToken) {
        console.error("No active game.");
        return null;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/games/${encodeURIComponent(gameCode)}`,
            {
                headers: getGameHeaders(),
            }
        );

        if (!response.ok) {
            throw new Error("Could not retrieve game state.");
        }

        const gameState = await response.json();
        console.log("Game state received:", gameState);

        return gameState;

    } catch (error) {
        console.error("Error fetching game state:", error);
        return null;
    }
}

export async function drawCard() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/games/${encodeURIComponent(gameCode)}/draw`, {
            method: "POST",
            headers: getGameHeaders(),
        });

        if (!response.ok) {
            throw new Error("Could not draw a card.");
        }

        const gameState = await response.json();
        console.log("Card drawn!");
        console.log("Update hand:", gameState.hand);
        return gameState;

    } catch (error) {
        console.error("Error drawing card:", error);
        return null;
    }
}

export async function drawFromDiscardPile() {

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/games/${encodeURIComponent(gameCode)}/draw/discard`,
            {
                method: "POST",
                headers: getGameHeaders()
            }
        );

        if (!response.ok) {
            throw new Error("Could not draw from the discard pile.");
        }

        const gameState = await response.json();

        console.log("Discard pile picked up!");
        return gameState;

    } catch (error) {
        console.error("Error picking up discard pile:", error);
        return null;
    }
}

export async function discardCard(cardId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/games/${encodeURIComponent(gameCode)}/discard`, {
            method: "POST",
            headers: {
                ...getGameHeaders(),
                "Content-Type": "application/json"
            },
            body: JSON.stringify({cardId})
        });

        if (!response.ok) {
            throw new Error("Could not discard card.");
        }

        return await response.json();

    } catch (error) {
        console.error("Error discarding card:", error);
        return null;
    }
}

export async function createMeld(cardIds, meldIndex = null) {

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/games/${encodeURIComponent(gameCode)}/meld`,
            {
                method: "POST",
                headers: {
                    ...getGameHeaders(),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    cardIds,
                    meldIndex
                })
            }
        );

        if (!response.ok) {
            throw new Error("Could not create meld.");
        }

        return await response.json();

    } catch (error) {
        console.error("Error creating meld:", error);
        return null;
    }
}

export async function takeBackMeld(meldIndex) {

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/games/${encodeURIComponent(gameCode)}/meld/take-back`,
            {
                method: "POST",
                headers: {
                    ...getGameHeaders(),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    meldIndex
                })
            }
        );

        if (!response.ok) {
            throw new Error("Could not take back meld.")
        }

        return await response.json();

    } catch (error) {
        console.error("Error taking back meld:", error);
        return null;
    }
}
