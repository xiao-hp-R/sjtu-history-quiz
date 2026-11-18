// 俄罗斯方块核心常量与工具函数

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

// 7 种方块的形状矩阵（1 表示有格子）
export const TETROMINOES = {
  I: {
    color: '#00f0f0',
    shapes: [
      [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
      [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
      [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
      [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
    ],
  },
  O: {
    color: '#f0f000',
    shapes: [
      [[1, 1], [1, 1]],
    ],
  },
  T: {
    color: '#a000f0',
    shapes: [
      [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
      [[0, 1, 0], [0, 1, 1], [0, 1, 0]],
      [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
      [[0, 1, 0], [1, 1, 0], [0, 1, 0]],
    ],
  },
  S: {
    color: '#00f000',
    shapes: [
      [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
      [[0, 1, 0], [0, 1, 1], [0, 0, 1]],
      [[0, 0, 0], [0, 1, 1], [1, 1, 0]],
      [[1, 0, 0], [1, 1, 0], [0, 1, 0]],
    ],
  },
  Z: {
    color: '#f00000',
    shapes: [
      [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
      [[0, 0, 1], [0, 1, 1], [0, 1, 0]],
      [[0, 0, 0], [0, 1, 1], [0, 1, 1]],
      [[0, 1, 0], [1, 1, 0], [1, 0, 0]],
    ],
  },
  J: {
    color: '#0000f0',
    shapes: [
      [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
      [[0, 1, 1], [0, 1, 0], [0, 1, 0]],
      [[0, 0, 0], [1, 1, 1], [0, 0, 1]],
      [[0, 1, 0], [0, 1, 0], [1, 1, 0]],
    ],
  },
  L: {
    color: '#f0a000',
    shapes: [
      [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
      [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
      [[0, 0, 0], [1, 1, 1], [1, 0, 0]],
      [[1, 1, 0], [0, 1, 0], [0, 1, 0]],
    ],
  },
};

const PIECE_KEYS = Object.keys(TETROMINOES);

// 随机生成一个新方块（含旋转状态、颜色、出生位置）
export function createPiece() {
  const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
  const def = TETROMINOES[key];
  return {
    key,
    color: def.color,
    shape: def.shapes[0],
    rotation: 0,
    x: Math.floor((BOARD_WIDTH - def.shapes[0][0].length) / 2),
    y: 0,
  };
}

// 判断方块在棋盘上是否会碰撞（越界或与已固定方块重叠）
export function collides(board, piece, offsetX = 0, offsetY = 0, shape = piece.shape) {
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) continue;
      const x = piece.x + col + offsetX;
      const y = piece.y + row + offsetY;
      if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) return true;
      if (y >= 0 && board[y][x]) return true;
    }
  }
  return false;
}

// 获取方块旋转后的形状（O 型只有一种，无需旋转）
export function rotatedShape(piece, direction = 1) {
  const def = TETROMINOES[piece.key];
  const count = def.shapes.length;
  if (count === 1) return piece.shape;
  const next = (piece.rotation + direction + count) % count;
  return def.shapes[next];
}

// 消除已填满的行，返回 { board, cleared }
export function clearLines(board) {
  const remaining = board.filter((row) => row.some((cell) => !cell));
  const cleared = BOARD_HEIGHT - remaining.length;
  const newBoard = [];
  for (let i = 0; i < cleared; i++) {
    newBoard.push(new Array(BOARD_WIDTH).fill(0));
  }
  return { board: newBoard.concat(remaining), cleared };
}

// 消行得分：1 行 100 分，2 行 300 分，3 行 500 分，4 行 800 分
export const SCORE_TABLE = [0, 100, 300, 500, 800];
