import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  SCORE_TABLE,
  clearLines,
  collides,
  createPiece,
  rotatedShape,
} from './tetris';

// 每升一级（每消 10 行）下落间隔缩短
function dropInterval(level) {
  return Math.max(120, 800 - (level - 1) * 70);
}

function emptyBoard() {
  return Array.from({ length: BOARD_HEIGHT }, () => new Array(BOARD_WIDTH).fill(0));
}

export default function App() {
  const [board, setBoard] = useState(emptyBoard);
  const [piece, setPiece] = useState(() => createPiece());
  const [nextPiece, setNextPiece] = useState(() => createPiece());
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);

  // 用 ref 保存最新的棋盘和方块，避免闭包拿到旧值
  const boardRef = useRef(board);
  const pieceRef = useRef(piece);
  boardRef.current = board;
  pieceRef.current = piece;

  const levelRef = useRef(level);
  levelRef.current = level;
  const gameOverRef = useRef(gameOver);
  const pausedRef = useRef(paused);
  const startedRef = useRef(started);
  gameOverRef.current = gameOver;
  pausedRef.current = paused;
  startedRef.current = started;

  // 把当前方块固定到棋盘，消行，然后生成下一个方块
  // overridePiece 用于硬降时直接传入最终落点位置（绕过异步状态更新的延迟）
  const lockPiece = useCallback((overridePiece) => {
    const curBoard = boardRef.current;
    const curPiece = overridePiece || pieceRef.current;
    const newBoard = curBoard.map((row) => [...row]);
    curPiece.shape.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell && curPiece.y + r >= 0) {
          newBoard[curPiece.y + r][curPiece.x + c] = curPiece.color;
        }
      });
    });

    const { board: clearedBoard, cleared } = clearLines(newBoard);
    if (cleared > 0) {
      setScore((s) => s + SCORE_TABLE[cleared] * levelRef.current);
      setLines((l) => {
        const total = l + cleared;
        setLevel(Math.floor(total / 10) + 1);
        return total;
      });
    }
    setBoard(clearedBoard);

    // 生成新方块，如果一出生就碰撞，说明方块堆到顶了 —— 游戏结束
    const next = nextPieceRef.current;
    if (collides(clearedBoard, next)) {
      setGameOver(true);
    } else {
      setPiece(next);
      setNextPiece(createPiece());
    }
  }, []);

  const nextPieceRef = useRef(nextPiece);
  nextPieceRef.current = nextPiece;

  // 尝试移动方块（dx/dy 为偏移量），失败返回 false
  const tryMove = useCallback((dx, dy) => {
    if (gameOverRef.current || pausedRef.current || !startedRef.current) return false;
    const p = pieceRef.current;
    if (!collides(boardRef.current, p, dx, dy)) {
      setPiece((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      return true;
    }
    return false;
  }, []);

  const tryRotate = useCallback(() => {
    if (gameOverRef.current || pausedRef.current || !startedRef.current) return;
    const p = pieceRef.current;
    const shape = rotatedShape(p);
    // 简单的踢墙处理：原位不行就尝试左右偏移
    for (const dx of [0, -1, 1, -2, 2]) {
      if (!collides(boardRef.current, p, dx, 0, shape)) {
        setPiece((prev) => ({ ...prev, shape, x: prev.x + dx, rotation: (prev.rotation + 1) % 4 }));
        return;
      }
    }
  }, []);

  // 硬降：直接落到底并锁定
  const hardDrop = useCallback(() => {
    if (gameOverRef.current || pausedRef.current || !startedRef.current) return;
    const p = pieceRef.current;
    let dist = 0;
    while (!collides(boardRef.current, p, 0, dist + 1)) dist++;
    setPiece((prev) => ({ ...prev, y: prev.y + dist }));
    if (dist > 0) setScore((s) => s + dist * 2);
    lockPiece(dist > 0 ? { ...p, y: p.y + dist } : undefined);
  }, [lockPiece]);

  // 键盘控制
  useEffect(() => {
    const onKey = (e) => {
      if (!startedRef.current) {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          setStarted(true);
        }
        return;
      }
      switch (e.code) {
        case 'ArrowLeft':
          e.preventDefault();
          tryMove(-1, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          tryMove(1, 0);
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (tryMove(0, 1)) setScore((s) => s + 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          tryRotate();
          break;
        case 'Space':
          e.preventDefault();
          hardDrop();
          break;
        case 'KeyP':
          if (!gameOverRef.current) setPaused((p) => !p);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tryMove, tryRotate, hardDrop]);

  // 游戏主循环：按当前等级的速度让方块自动下落
  useEffect(() => {
    if (!started || gameOver || paused) return;
    const interval = setInterval(() => {
      if (!tryMove(0, 1)) {
        lockPiece();
      }
    }, dropInterval(level));
    return () => clearInterval(interval);
  }, [started, gameOver, paused, level, tryMove, lockPiece]);

  // 重新开始
  const restart = () => {
    setBoard(emptyBoard());
    setPiece(createPiece());
    setNextPiece(createPiece());
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setPaused(false);
    setStarted(true);
  };

  // 渲染棋盘（把当前方块叠加进去）
  const renderCells = [];
  const view = board.map((row) => [...row]);
  if (!gameOver) {
    piece.shape.forEach((row, r) => {
      row.forEach((cell, c) => {
        const y = piece.y + r;
        const x = piece.x + c;
        if (cell && y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
          view[y][x] = piece.color;
        }
      });
    });
  }
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      renderCells.push(
        <div
          key={`${y}-${x}`}
          className="cell"
          style={view[y][x] ? { background: view[y][x], boxShadow: 'inset 0 0 4px rgba(0,0,0,.5)' } : undefined}
        />
      );
    }
  }

  // 渲染下一个方块预览
  const previewCells = [];
  const previewGrid = Array.from({ length: 4 }, () => new Array(4).fill(null));
  nextPiece.shape.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell) previewGrid[r][c] = nextPiece.color;
    });
  });
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      previewCells.push(
        <div key={`p${y}-${x}`} className="cell small" style={previewGrid[y][x] ? { background: previewGrid[y][x] } : undefined} />
      );
    }
  }

  return (
    <div className="app">
      <h1>俄罗斯方块</h1>
      <div className="game-wrap">
        <div className="board">
          {renderCells}
          {!started && (
            <div className="overlay">
              <p>按 回车 / 空格 开始</p>
              <p className="hint">← → 移动　↑ 旋转<br />↓ 加速　空格 直落　P 暂停</p>
            </div>
          )}
          {paused && !gameOver && (
            <div className="overlay">
              <p>已暂停</p>
              <p className="hint">按 P 继续</p>
            </div>
          )}
          {gameOver && (
            <div className="overlay gameover">
              <p className="big">游戏结束</p>
              <p>得分：{score}</p>
              <button onClick={restart}>重新开始</button>
            </div>
          )}
        </div>
        <div className="panel">
          <div className="card">
            <h2>得分</h2>
            <div className="value">{score}</div>
          </div>
          <div className="card">
            <h2>等级</h2>
            <div className="value">{level}</div>
          </div>
          <div className="card">
            <h2>行数</h2>
            <div className="value">{lines}</div>
          </div>
          <div className="card">
            <h2>下一个</h2>
            <div className="preview">{previewCells}</div>
          </div>
          {!gameOver && (
            <button className="side-btn" onClick={() => (started ? setPaused((p) => !p) : setStarted(true))}>
              {!started ? '开始游戏' : paused ? '继续' : '暂停'}
            </button>
          )}
          {gameOver && (
            <button className="side-btn" onClick={restart}>重新开始</button>
          )}
        </div>
      </div>
    </div>
  );
}
