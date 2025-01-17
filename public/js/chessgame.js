const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

const getPieceUnicode = (piece) => {
    const unicodePieces = {
        p: "♙",
        r: "♖",
        n: "♘",
        b: "♗",
        q: "♕",
        k: "♔",
        P: "♟",
        R: "♜",
        N: "♞",
        B: "♝",
        Q: "♛",
        K: "♚",
    };
    return unicodePieces[piece.type] || "";
};

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";
    board.forEach((row, rowIndex) => {
        row.forEach((square, colIndex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add("square", (rowIndex + colIndex) % 2 === 0 ? "light" : "dark");
            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = colIndex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece", square.color === "w" ? "white" : "black");
                pieceElement.innerText = getPieceUnicode(square);

                // Allow dragging only for players, not spectators
                if (playerRole === square.color) {
                    pieceElement.draggable = true;

                    pieceElement.addEventListener("dragstart", (e) => {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowIndex, col: colIndex };
                        e.dataTransfer.setData("text/plain", "");
                    });

                    pieceElement.addEventListener("dragend", () => {
                        draggedPiece = null;
                        sourceSquare = null;
                    });
                } else {
                    pieceElement.draggable = false;
                }

                // Flip pieces for the black player
                if (playerRole === "b") {
                    pieceElement.style.transform = "rotate(180deg)";
                }

                squareElement.appendChild(pieceElement);
            }

            // Disable drop for spectators
            if (playerRole) {
                squareElement.addEventListener("dragover", (e) => e.preventDefault());
                squareElement.addEventListener("drop", (e) => {
                    e.preventDefault();
                    if (draggedPiece) {
                        const targetSquare = {
                            row: parseInt(squareElement.dataset.row),
                            col: parseInt(squareElement.dataset.col),
                        };
                        handleMove(sourceSquare, targetSquare);
                    }
                });
            }

            boardElement.appendChild(squareElement);
        });
    });

    // Flip the board for black player, but not for spectators
    if (playerRole === "b") {
        boardElement.classList.add("flipped");
    } else {
        boardElement.classList.remove("flipped");
    }
};

const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: "q",
    };
    socket.emit("move", move);
};

// Handle player role assignment
socket.on("playerRole", (role) => {
    playerRole = role;
    renderBoard();
});

// Handle spectator role
socket.on("spectatorRole", () => {
    playerRole = null; // No role for spectators
    renderBoard();
});

// Update board state for everyone (players and spectators)
socket.on("boardState", (fen) => {
    chess.load(fen);
    renderBoard();
});

// Handle moves broadcasted from the server
socket.on("move", (move) => {
    chess.move(move);
    renderBoard();
});

// Handle errors
socket.on("error", (message) => {
    alert(message);
});

// Initial board rendering
renderBoard();
