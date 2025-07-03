// 定数
const BOARD_SIZE = 15;
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const boardElement = document.getElementById("board");


let gamePhase = "waiting_place"; 
// 状態の種類：
// "waiting_place" … 石を置く段階
// "waiting_observe" … 石を置いた後、観測するか選ぶ段階

const observeControls = document.getElementById("observe-controls");
const observeBtn = document.getElementById("observe-button");
const skipObserveBtn = document.getElementById("skip-observe-button");
let preObservationState = null; // 観測前の盤面保存用
const revertBtn = document.getElementById("revert-button");

let gameEnded = false;

const boardRef = window.boardRef;
const gameStateRef = window.gameStateRef;
const observedBoardRef = window.observedBoardRef;

// 盤面データの2次元配列
const board = [];

// 各プレイヤーの確率候補
const blackProbs = [0.9, 0.7];
const whiteProbs = [0.3, 0.1];

// 現在の確率インデックス
let blackProbIndex = 0;
let whiteProbIndex = 0;



function createBoard() {
  observeControls.style.display = "none";
  gamePhase = "waiting_place"; 
  blackProbIndex = 0;
  whiteProbIndex = 0;

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; // ← これも必要！

  for (let y = -1; y < BOARD_SIZE; y++) {
    const row = [];
    for (let x = -1; x < BOARD_SIZE; x++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.x = x;
      cell.dataset.y = y;

      if (y === -1 && x === -1) {
        // 左上の空白
        cell.style.backgroundColor = "#ddd";
      } else if (y === -1) {
        // 上側の文字列（A, B, C...）
        cell.textContent = letters[x];
        cell.style.backgroundColor = "#ddd";
        cell.style.fontWeight = "bold";
        cell.style.textAlign = "center";
      } else if (x === -1) {
        // 左側の数字（1, 2, 3...）
        cell.textContent = y + 1;
        cell.style.backgroundColor = "#ddd";
        cell.style.fontWeight = "bold";
        cell.style.textAlign = "center";
      } else {
        // 通常マス
        row.push({
          x,
          y,
          element: cell,
          observed: false,
          owner: null,
          probability: null,
        });
      }

      boardElement.appendChild(cell);
    }
    if (y >= 0) board.push(row);
  }


}

const resetBtn = document.getElementById("reset-button");

//再起動ボタンの挙動
resetBtn.addEventListener("click", () => {
  // 1. ローカルの board を空に
  board.length = 0;

  // 2. HTMLの盤面をクリア
  while (boardElement.firstChild) {
    boardElement.removeChild(boardElement.firstChild);
  }

  // 3. 再生成
  createBoard();

  // 4. 空の盤面データを作ってFirebaseに送信
  const emptyBoard = board.map(row =>
    row.map(cell => ({
      x: cell.x,
      y: cell.y,
      owner: null,
      probability: null,
      observed: false
    }))
  );

  boardRef.set(emptyBoard);
  gameStateRef.set({
    currentPlayer: "black",
    gamePhase: "waiting_place",
    gameEnded: false,
    blackProbIndex: 0,
    whiteProbIndex: 0
  });
});






// 現在のターンに対応する確率を取得
function getNextProbability() {
  if (currentPlayer === "black") {
    const prob = blackProbs[blackProbIndex];
    blackProbIndex = (blackProbIndex + 1) % blackProbs.length;
    return prob;
  } else {
    const prob = whiteProbs[whiteProbIndex];
    whiteProbIndex = (whiteProbIndex + 1) % whiteProbs.length;
    return prob;
  }
}



let currentPlayer = "black"; // 初期ターン
const probabilitySelect = document.getElementById("probability-select");

// マスをクリックしたときの処理
boardElement.addEventListener("click", (e) => {

    const cellEl = e.target;
    if (!cellEl.classList.contains("cell")) return;
    if (gameEnded || gamePhase !== "waiting_place") return;
    const x = parseInt(cellEl.dataset.x, 10);
    const y = parseInt(cellEl.dataset.y, 10);
    const cellData = board[y][x];
    console.log(cellData.owner)
    if (cellData.owner !== null && cellData.owner!==undefined) return;


    //const selectedProb = parseFloat(probabilitySelect.value);
    const selectedProb = getNextProbability();

  
    // 石データ更新
    cellData.owner = currentPlayer;
    cellData.probability = selectedProb;
    cellData.observed = false;
  

    cellData.owner = currentPlayer;
    cellData.probability = selectedProb;
    cellData.observed = false;
    
    const percent = Math.round(selectedProb * 100);
    cellData.element.textContent = percent;
    
    // スタイル設定：高確率は黒背景に白文字、低確率は白背景に黒文字
    if (selectedProb >= 0.5) {
        if(selectedProb>=0.8){
            cellData.element.style.backgroundColor = "black";
        }else{
            cellData.element.style.backgroundColor = "#696969";
        }
    cellData.element.style.color = "white";
    } else {
        if(selectedProb >= 0.2){
            cellData.element.style.backgroundColor = "#dcdcdc";
        }else{
            cellData.element.style.backgroundColor = "white";
        }
    cellData.element.style.color = "black";
    }
    
    cellData.element.classList.add("unobserved");
    
    // この時点で観測フェーズへ
    gamePhase = "waiting_observe";
    observeControls.style.display = "block";




    
  });


  
  
  function switchTurn() {
    currentPlayer = currentPlayer === "black" ? "white" : "black";
    //updateTurnDisplay();
    updateTurnIndicator();
    gamePhase = "waiting_place";

    gameStateRef.set({
      currentPlayer: currentPlayer,
      gamePhase: "waiting_place",
      gameEnded: false,
      blackProbIndex:blackProbIndex,
      whiteProbIndex:whiteProbIndex
  
    });
    
  }
  

const turnIndicator = document.getElementById("turn-indicator");

 function updateTurnIndicator() {
   turnIndicator.textContent = `現在のターン：${currentPlayer === "black" ? "黒" : "白"}`;
}


  

const observeButton = document.getElementById("observe-button");

observeButton.addEventListener("click", () => {
    // 保存：深いコピーを取って元に戻せるようにする
    if (gameEnded || gamePhase !== "waiting_observe") return;

preObservationState = board.map(row => row.map(cell => ({
    owner: cell.owner,
    probability: cell.probability,
    observed: cell.observed
  })));

  const observedData = board.map(row => row.map(cell => {
    if (cell.owner && !cell.observed) {
      const r = Math.random();
      const isBlack = r < cell.probability;
      const tempColor = isBlack ? "black" : "white";
      return { tempColor };
    } else {
      return { tempColor: null };
    }
  }));

  // Firebaseに観測結果を送信（全員が見る）
  observedBoardRef.set(observedData);

});

revertBtn.addEventListener("click", () => {
    board.forEach((row, y) => {
      row.forEach((cell, x) => {
        const saved = preObservationState[y][x];
        cell.owner = saved.owner;
        cell.probability = saved.probability;
        cell.observed = saved.observed;
        delete cell.tempColor;
  
            if (cell.owner) {
            const percent = Math.round(cell.probability * 100);
            cell.element.textContent = percent;
    
            if (cell.probability >= 0.5) {
                if(cell.probability>=0.8){
                    cell.element.style.backgroundColor = "black";
                }else{
                    cell.element.style.backgroundColor = "#696969";
                }
                cell.element.style.color = "white";
            } else {
                
            if(cell.probability >= 0.2){
                cell.element.style.backgroundColor = "#dcdcdc";
            }else{
                cell.element.style.backgroundColor = "white";
            }
                cell.element.style.color = "black";
            }
        } else {
          cell.element.textContent = "";
          cell.element.style.backgroundColor = "";
          cell.element.style.color = "";
        }
      });
    });
  
    revertBtn.style.display = "none";
    switchTurn(); // 戻したあとターンを交代

            // 石を置いたあと、Firebaseに保存
    boardRef.set(getSerializableBoard());
    observedBoardRef.remove();

  });

  skipObserveBtn.addEventListener("click", () => {
    observeControls.style.display = "none";
    switchTurn();

            // 石を置いたあと、Firebaseに保存
  boardRef.set(getSerializableBoard());

  });
  
  function checkVictory() {
    const directions = [
      [1, 0],  // 横
      [0, 1],  // 縦
      [1, 1],  // 斜め右下
      [1, -1], // 斜め右上
    ];
  
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const cell = board[y]?.[x];
        if (!cell || !cell.owner || cell.tempColor === undefined) continue;
  
        const color = cell.tempColor;
  
        for (const [dx, dy] of directions) {
          let count = 1;
          for (let step = 1; step < 5; step++) {
            const nx = x + dx * step;
            const ny = y + dy * step;
            const nextCell = board[ny]?.[nx];
            if (!nextCell || nextCell.tempColor !== color) break;
            count++;
          }
          if (count >= 5) {
            return color;
          }
        }
      }
    }
  
    return null;
  }
  

  // Firebaseに送信できるように変換（HTML要素を除外）
function getSerializableBoard() {
  return board.map(row =>
    row.map(cell => ({
      x: cell.x,
      y: cell.y,
      owner: cell.owner ?? null,
      probability: cell.probability ?? null,
      observed: cell.observed ?? null
    }))
  );
}

// Firebaseから受信した盤面データをboardと表示に反映
function updateBoardFromData(data) {
  if (!data) return;

  for (let y = 0; y < BOARD_SIZE; y++) {
    if (!data[y]) continue;
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (!data[y][x]) continue;
      const received = data[y][x];
      const cell = board[y][x];

      if (!cell.element) {
        const selector = `.cell[data-x="${x}"][data-y="${y}"]`;
        cell.element = document.querySelector(selector);
      }

      cell.owner = received.owner ?? null;
      cell.probability = received.probability ?? null;
      cell.observed = received.observed ?? false;

      if (!cell.element) continue;

      if (cell.owner) {
        if (cell.observed) {
          // 観測済みなら●か○
          const isBlack = cell.owner === "black";
          cell.element.textContent = isBlack ? "●" : "○";
          cell.element.style.backgroundColor = "";
          cell.element.style.color = "";
        } else {
          // 観測前 → 確率表示
          const percent = Math.round(cell.probability * 100);
          cell.element.textContent = percent;
          if (cell.probability >= 0.5) {
            cell.element.style.backgroundColor = cell.probability >= 0.8 ? "black" : "#696969";
            cell.element.style.color = "white";
          } else {
            cell.element.style.backgroundColor = cell.probability >= 0.2 ? "#dcdcdc" : "white";
            cell.element.style.color = "black";
          }
        }
      } else {
        cell.element.textContent = "";
        cell.element.style.backgroundColor = "";
        cell.element.style.color = "";
      }
    }
  }
}



window.addEventListener("DOMContentLoaded", () => {
  // 他人の操作を受信して反映
  window.boardRef.on("value", (snapshot) => {
    const data = snapshot.val();
    updateBoardFromData(data);
  });

  window.gameStateRef.on("value", (snapshot) => {
    const state = snapshot.val();
    if (!state) return;

    currentPlayer = state.currentPlayer;
    gamePhase = state.gamePhase;
    gameEnded = state.gameEnded;
    blackProbIndex = state.blackProbIndex;
    whiteProbIndex = state.whiteProbIndex;

    updateTurnIndicator();

    if (gamePhase === "waiting_observe" && !gameEnded) {
      observeControls.style.display = "block";
    } else {
      observeControls.style.display = "none";
    }
  });
});

observedBoardRef.on("value", (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (!data[y] || !data[y][x]) continue;

      const tempColor = data[y][x].tempColor;
      if (tempColor) {
        board[y][x].tempColor = tempColor;
        board[y][x].element.textContent = tempColor === "black" ? "●" : "○";
        board[y][x].element.style.backgroundColor = "";
        board[y][x].element.style.color = "";
      }
    }
  }

  // 勝敗判定
  const winner = checkVictory();
  if (winner) {
    alert(`${winner === "black" ? "黒" : "白"}の勝ちです！`);
    gameEnded = true;
    revertBtn.style.display = "none";
    gameStateRef.update({ gameEnded: true });
  } else {
    revertBtn.style.display = "inline-block";
  }
});



createBoard(); // 盤面を生成
updateTurnIndicator();




