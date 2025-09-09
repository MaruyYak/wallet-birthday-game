import { Injectable } from '@angular/core';

export interface Obstacle {
  x: number;
  gapY: number;
  width: number;
  gapHeight: number;
}

export interface Letter {
  x: number;
  y: number;
  char: string;
  collected: boolean;
}

export interface GameState {
  width: number;
  height: number;
  playerX: number;
  playerY: number;
  velocity: number;
  gravity: number;
  jumpPower: number;
  score: number;
  isGameOver: boolean;
  obstacles: Obstacle[];
  obstacleTimer: number;
  obstacleInterval: number;
  letters: Letter[];
  isFinalCakeShown: boolean;
}

@Injectable({ providedIn: 'root' })
export class GameEngineService {
  state!: GameState;

  // private cakeIngredients = ['🌾', '🥛'];
  private cakeIngredients = ['🌾', '🥛', '🥚', '🍯', '🍫', '🥭'];
  private collectedIngredients: string[] = [];
  private candlesCount = 4;
  private collectedCandles = 0;

  init(width: number, height: number) {
    this.state = {
      width,
      height,
      playerX: Math.round(width * 0.25),
      playerY: Math.round(height * 0.5),
      velocity: 0,
      gravity: 1300,
      jumpPower: 420,
      score: 0,
      isGameOver: false,
      obstacles: [],
      obstacleTimer: 0,
      obstacleInterval: 1.8, // чуть реже трубы
      letters: [],
      isFinalCakeShown: false
    };

    this.collectedIngredients = [];
    this.collectedCandles = 0;
  }

  update(dtSec: number) {
    const st = this.state;
    if (st.isGameOver) return;

    // движение игрока
    st.velocity += st.gravity * dtSec;
    st.playerY += st.velocity * dtSec;

    if (st.playerY < 16) {
      st.playerY = 16;
      st.velocity = 0;
    }
    if (st.playerY > st.height - 16) {
      st.playerY = st.height - 16;
      st.isGameOver = true;
    }

    // генерация препятствий
    st.obstacleTimer += dtSec;
    if (st.obstacleTimer > st.obstacleInterval) {
      st.obstacleTimer = 0;
      this.addObstacle();
    }

    // движение труб
    for (let i = st.obstacles.length - 1; i >= 0; i--) {
      const obs = st.obstacles[i];
      obs.x -= 200 * dtSec;

      const playerSize = 32;
      if (
        st.playerX + playerSize / 2 > obs.x &&
        st.playerX - playerSize / 2 < obs.x + obs.width
      ) {
        if (
          st.playerY - playerSize / 2 < obs.gapY ||
          st.playerY + playerSize / 2 > obs.gapY + obs.gapHeight
        ) {
          st.isGameOver = true;
        }
      }

      if (obs.x + obs.width < 0) {
        st.obstacles.splice(i, 1);
        st.score++;
      }
    }

    // движение предметов (ингредиенты/свечи)
    for (const item of st.letters) {
      if (item.collected) continue;

      item.x -= 200 * dtSec;

      const playerSize = 32;
      const itemSize = 24;
      if (
        st.playerX + playerSize / 2 > item.x &&
        st.playerX - playerSize / 2 < item.x + itemSize &&
        st.playerY + playerSize / 2 > item.y &&
        st.playerY - playerSize / 2 < item.y + itemSize
      ) {
        item.collected = true;

        if (this.cakeIngredients.includes(item.char)) {
          this.collectedIngredients.push(item.char);
        } else if (item.char === '🕯️') {
          this.collectedCandles++;
        }
      }
    }

    // фильтруем старые предметы
    st.letters = st.letters.filter(l => l.x + 24 > 0 && !l.collected);

    // проверка на финальный торт
    if (!st.isFinalCakeShown && this.allCollected()) {
      this.showFinalCake();
    }
  }

  jump() {
    if (this.state.isGameOver) return;
    this.state.velocity = -this.state.jumpPower;
  }

  reset() {
    const { width, height } = this.state;
    this.init(width, height);
  }

  private addObstacle() {
    if (this.state.isFinalCakeShown) return;

    const { width, height } = this.state;
    const gapHeight = 180;
    const minY = 50;
    const maxY = height - gapHeight - 50;
    const gapY = Math.random() * (maxY - minY) + minY;

    const newObs: Obstacle = {
      x: width,
      gapY,
      width: 60,
      gapHeight
    };

    this.state.obstacles.push(newObs);

    if (this.collectedIngredients.length < this.cakeIngredients.length) {
      this.addIngredientInObstacle(newObs);
    } else if (this.collectedCandles < this.candlesCount) {
      this.addCandleInObstacle(newObs);
    }
  }

  private addIngredientInObstacle(obs: Obstacle) {
    const nextIngredient = this.cakeIngredients.find(
      ing => !this.collectedIngredients.includes(ing)
    );
    if (!nextIngredient) return;

    const x = obs.x + obs.width / 2 - 12;
    const y = obs.gapY + obs.gapHeight / 2 - 12;

    this.state.letters.push({
      x,
      y,
      char: nextIngredient,
      collected: false
    });
  }

  private addCandleInObstacle(obs: Obstacle) {
    const x = obs.x + obs.width / 2 - 12;
    const y = obs.gapY + obs.gapHeight / 2 - 12;

    this.state.letters.push({
      x,
      y,
      char: '🕯️',
      collected: false
    });
  }

  private showFinalCake() {
    this.state.isFinalCakeShown = true;
    this.state.obstacles = [];
    this.state.letters = [
      {
        x: this.state.width / 2 - 32,
        y: this.state.height / 2 - 32,
        char: '🎂 Happy Birthday Telegram Wallet 🎂',
        collected: true
      }
    ];
  }

  private allCollected(): boolean {
    return (
      this.collectedIngredients.length === this.cakeIngredients.length &&
      this.collectedCandles === this.candlesCount
    );
  }
}
