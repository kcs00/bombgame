document.addEventListener('DOMContentLoaded', () => {
    // 게임 설정
    let config = {
        easy: { rows: 9, cols: 9, mines: 10 },
        medium: { rows: 16, cols: 16, mines: 40 },
        hard: { rows: 16, cols: 30, mines: 99 }
    };

    // 게임 상태
    let gameState = {
        board: [],
        mineLocations: [],
        rows: config.easy.rows,
        cols: config.easy.cols,
        mines: config.easy.mines,
        flagsLeft: config.easy.mines,
        revealed: 0,
        gameOver: false,
        gameWon: false,
        timerInterval: null,
        time: 0,
        firstClick: true
    };

    // DOM 요소
    const boardElement = document.getElementById('board');
    const flagsLeftElement = document.getElementById('flags-left');
    const timerElement = document.getElementById('timer');
    const resetButton = document.getElementById('reset');
    const easyButton = document.getElementById('easy');
    const mediumButton = document.getElementById('medium');
    const hardButton = document.getElementById('hard');

    // 난이도 버튼 이벤트 리스너
    easyButton.addEventListener('click', () => setDifficulty('easy'));
    mediumButton.addEventListener('click', () => setDifficulty('medium'));
    hardButton.addEventListener('click', () => setDifficulty('hard'));
    resetButton.addEventListener('click', initGame);

    // 난이도 설정 함수
    function setDifficulty(level) {
        gameState.rows = config[level].rows;
        gameState.cols = config[level].cols;
        gameState.mines = config[level].mines;
        initGame();
    }

    // 게임 초기화 함수
    function initGame() {
        // 타이머 초기화
        clearInterval(gameState.timerInterval);
        gameState.time = 0;
        timerElement.textContent = '0';

        // 게임 상태 초기화
        gameState.board = [];
        gameState.mineLocations = [];
        gameState.flagsLeft = gameState.mines;
        gameState.revealed = 0;
        gameState.gameOver = false;
        gameState.gameWon = false;
        gameState.firstClick = true;

        // 플래그 카운터 업데이트
        flagsLeftElement.textContent = gameState.flagsLeft;

        // 게임 보드 생성
        createBoard();

        // 게임 오버 메시지 제거
        const existingGameOver = document.querySelector('.game-over');
        if (existingGameOver) {
            existingGameOver.remove();
        }
    }

    // 게임 보드 생성 함수
    function createBoard() {
        // 보드 요소 초기화
        boardElement.innerHTML = '';
        boardElement.style.gridTemplateColumns = `repeat(${gameState.cols}, 30px)`;
        boardElement.style.gridTemplateRows = `repeat(${gameState.rows}, 30px)`;

        // 셀 생성
        for (let row = 0; row < gameState.rows; row++) {
            gameState.board[row] = [];
            for (let col = 0; col < gameState.cols; col++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = row;
                cell.dataset.col = col;

                // 클릭 이벤트 리스너
                cell.addEventListener('click', () => handleCellClick(row, col));
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    handleRightClick(row, col);
                });

                boardElement.appendChild(cell);
                gameState.board[row][col] = {
                    element: cell,
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    count: 0
                };
            }
        }
    }

    // 지뢰 배치 함수
    function placeMines(firstRow, firstCol) {
        // 첫 번째 클릭 위치와 주변 8칸은 지뢰가 없도록 설정
        const safeZone = [];
        for (let r = Math.max(0, firstRow - 1); r <= Math.min(gameState.rows - 1, firstRow + 1); r++) {
            for (let c = Math.max(0, firstCol - 1); c <= Math.min(gameState.cols - 1, firstCol + 1); c++) {
                safeZone.push(`${r},${c}`);
            }
        }

        // 지뢰 배치
        let minesPlaced = 0;
        while (minesPlaced < gameState.mines) {
            const row = Math.floor(Math.random() * gameState.rows);
            const col = Math.floor(Math.random() * gameState.cols);
            const key = `${row},${col}`;

            // 이미 지뢰가 있거나 안전 지대인 경우 건너뛰기
            if (gameState.board[row][col].isMine || safeZone.includes(key)) {
                continue;
            }

            gameState.board[row][col].isMine = true;
            gameState.mineLocations.push({ row, col });
            minesPlaced++;
        }

        // 각 셀의 주변 지뢰 수 계산
        calculateCounts();
    }

    // 주변 지뢰 수 계산 함수
    function calculateCounts() {
        for (let row = 0; row < gameState.rows; row++) {
            for (let col = 0; col < gameState.cols; col++) {
                if (gameState.board[row][col].isMine) continue;

                let count = 0;
                // 주변 8칸 확인
                for (let r = Math.max(0, row - 1); r <= Math.min(gameState.rows - 1, row + 1); r++) {
                    for (let c = Math.max(0, col - 1); c <= Math.min(gameState.cols - 1, col + 1); c++) {
                        if (r === row && c === col) continue;
                        if (gameState.board[r][c].isMine) count++;
                    }
                }
                gameState.board[row][col].count = count;
            }
        }
    }

    // 셀 클릭 처리 함수
    function handleCellClick(row, col) {
        // 게임 오버 상태이거나 이미 공개된 셀이거나 깃발이 꽂힌 셀은 무시
        if (gameState.gameOver || gameState.board[row][col].isRevealed || gameState.board[row][col].isFlagged) {
            return;
        }

        // 첫 번째 클릭인 경우
        if (gameState.firstClick) {
            gameState.firstClick = false;
            placeMines(row, col);
            startTimer();
        }

        // 지뢰를 클릭한 경우
        if (gameState.board[row][col].isMine) {
            gameOver(false);
            return;
        }

        // 셀 공개
        revealCell(row, col);

        // 승리 조건 확인
        checkWinCondition();
    }

    // 우클릭 처리 함수 (깃발 설정/해제)
    function handleRightClick(row, col) {
        // 게임 오버 상태이거나 이미 공개된 셀은 무시
        if (gameState.gameOver || gameState.board[row][col].isRevealed) {
            return;
        }

        const cell = gameState.board[row][col];

        // 깃발 토글
        if (cell.isFlagged) {
            cell.isFlagged = false;
            cell.element.classList.remove('flagged');
            cell.element.textContent = '';
            gameState.flagsLeft++;
        } else if (gameState.flagsLeft > 0) {
            cell.isFlagged = true;
            cell.element.classList.add('flagged');
            cell.element.textContent = '🚩';
            gameState.flagsLeft--;
        }

        // 플래그 카운터 업데이트
        flagsLeftElement.textContent = gameState.flagsLeft;

        // 승리 조건 확인
        checkWinCondition();
    }

    // 셀 공개 함수
    function revealCell(row, col) {
        const cell = gameState.board[row][col];

        // 이미 공개된 셀이거나 깃발이 꽂힌 셀은 무시
        if (cell.isRevealed || cell.isFlagged) {
            return;
        }

        // 셀 공개
        cell.isRevealed = true;
        cell.element.classList.add('revealed');
        gameState.revealed++;

        // 주변 지뢰 수에 따라 표시
        if (cell.count > 0) {
            cell.element.textContent = cell.count;
            cell.element.dataset.count = cell.count;
        } else {
            // 주변 지뢰가 없는 경우 주변 셀 자동 공개 (재귀)
            for (let r = Math.max(0, row - 1); r <= Math.min(gameState.rows - 1, row + 1); r++) {
                for (let c = Math.max(0, col - 1); c <= Math.min(gameState.cols - 1, col + 1); c++) {
                    if (r === row && c === col) continue;
                    revealCell(r, c);
                }
            }
        }
    }

    // 승리 조건 확인 함수
    function checkWinCondition() {
        // 모든 비지뢰 셀이 공개되었거나 모든 지뢰에 깃발이 꽂혔는지 확인
        const totalCells = gameState.rows * gameState.cols;
        const nonMineCells = totalCells - gameState.mines;

        if (gameState.revealed === nonMineCells) {
            gameOver(true);
        }

        // 모든 지뢰에 깃발이 꽂혔는지 확인
        if (gameState.flagsLeft === 0) {
            let allMinesFlagged = true;
            for (const { row, col } of gameState.mineLocations) {
                if (!gameState.board[row][col].isFlagged) {
                    allMinesFlagged = false;
                    break;
                }
            }
            if (allMinesFlagged) {
                gameOver(true);
            }
        }
    }

    // 게임 오버 함수
    function gameOver(isWin) {
        gameState.gameOver = true;
        gameState.gameWon = isWin;
        clearInterval(gameState.timerInterval);

        // 모든 지뢰 공개
        for (const { row, col } of gameState.mineLocations) {
            const cell = gameState.board[row][col];
            if (!cell.isFlagged) {
                cell.element.classList.add('mine');
                cell.element.textContent = '💣';
            }
        }

        // 게임 오버 메시지 표시
        const gameOverElement = document.createElement('div');
        gameOverElement.classList.add('game-over');

        const gameOverContent = document.createElement('div');
        gameOverContent.classList.add('game-over-content');

        const gameOverTitle = document.createElement('h2');
        gameOverTitle.textContent = isWin ? '축하합니다! 승리했습니다!' : '게임 오버! 지뢰를 밟았습니다!';

        const gameOverTime = document.createElement('p');
        gameOverTime.textContent = `소요 시간: ${gameState.time}초`;

        const newGameButton = document.createElement('button');
        newGameButton.textContent = '새 게임';
        newGameButton.addEventListener('click', () => {
            gameOverElement.remove();
            initGame();
        });

        gameOverContent.appendChild(gameOverTitle);
        gameOverContent.appendChild(gameOverTime);
        gameOverContent.appendChild(newGameButton);
        gameOverElement.appendChild(gameOverContent);
        document.body.appendChild(gameOverElement);
    }

    // 타이머 시작 함수
    function startTimer() {
        gameState.timerInterval = setInterval(() => {
            gameState.time++;
            timerElement.textContent = gameState.time;
        }, 1000);
    }

    // 게임 초기화
    initGame();
});