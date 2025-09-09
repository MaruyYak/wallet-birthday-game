import { Injectable } from '@angular/core';

export interface Obstacle {
  x: number;
  gapY: number;
  width: number;
  gapHeight: number;
  coinLogosTop: CoinLogo[];
  coinLogosBottom: CoinLogo[];
}

export interface Letter {
  x: number;
  y: number;
  char: string;
  collected: boolean;
}

export interface CoinLogo {
  name: string;
  img: HTMLImageElement;
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

export interface Ingredient {
  name: string;
  img: HTMLImageElement;
}

@Injectable({ providedIn: 'root' })
export class GameEngineService {
  state!: GameState;

  public isGameStarted = false;
  private coinLogos: CoinLogo[] = [];
  private cakeIngredients: Ingredient[] = [];
  private collectedIngredients: Ingredient[] = [];
  public candlesCount = 4;
  public collectedCandles = 0;

  // --- для плавного финального экрана ---
  public finalCakeOpacity = 0;
  private showFinalTimer: number | null = null;

  getAllCakeIngredients(): Ingredient[] {
    return this.cakeIngredients;
  }

  getCollectedIngredients(): Ingredient[] {
    return this.collectedIngredients;
  }

  collectIngredient(ingredient: Ingredient) {
    if (!this.collectedIngredients.includes(ingredient)) {
      this.collectedIngredients.push(ingredient);
    }
  }

  async loadCakeIngredients() {
    const ingredientNames = [
      'flour',
      'egg',
      'sugar',
      'cocoa',
      'strawberry',
      'cream',
      'candle'
    ];
    this.cakeIngredients = [];

    for (const name of ingredientNames) {
      const img = new Image();
      img.src = `assets/ingredients/${name}.png`;
      await new Promise<void>((res) => {
        img.onload = () => res();
        img.onerror = () => {
          console.warn(`Ingredient not loaded: ${name}`);
          res();
        };
      });
      this.cakeIngredients.push({ name, img });
    }
  }

  async loadCoinLogos() {
    const coins = ['btc', 'eth', 'usdt', 'ton', 'sol', 'bnb', 'shib', 'doge'];
    this.coinLogos = [];

    for (const name of coins) {
      const img = new Image();
      img.src = `assets/${name}.png`;
      await new Promise<void>((res) => {
        img.onload = () => res();
        img.onerror = () => {
          console.warn(`Coin image not loaded: ${name}`);
          res();
        };
      });
      this.coinLogos.push({ name, img });
    }
  }

  getCoinLogos(): CoinLogo[] {
    return this.coinLogos;
  }

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
      obstacleInterval: 1.8,
      letters: [],
      isFinalCakeShown: false
    };

    this.collectedIngredients = [];
    this.collectedCandles = 0;
    this.finalCakeOpacity = 0;
    this.showFinalTimer = null;
  }

  startGame() {
    this.isGameStarted = true;
    this.collectedIngredients = [];
    this.collectedCandles = 0;
    if (this.state) {
      this.state.isGameOver = false;
      this.state.isFinalCakeShown = false;
      this.state.obstacles = [];
      this.state.letters = [];
      this.state.score = 0;
      this.state.playerX = Math.round(this.state.width * 0.25);
      this.state.playerY = Math.round(this.state.height * 0.5);
      this.state.velocity = 0;
      this.state.obstacleTimer = 0;
      this.finalCakeOpacity = 0;
      this.showFinalTimer = null;
    }
  }

  update(dtSec: number) {
    const st = this.state;
    if (!this.isGameStarted || st.isGameOver) return;

    // --- движение игрока ---
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

    // --- генерация препятствий ---
    st.obstacleTimer += dtSec;
    if (st.obstacleTimer > st.obstacleInterval && !st.isFinalCakeShown) {
      st.obstacleTimer = 0;
      this.addObstacle();
    }

    // --- движение труб ---
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

    // --- движение предметов (ингредиенты/свечи) ---
    for (const item of st.letters) {
      if (item.collected) continue;

      item.x -= 200 * dtSec;

      const playerSize = 32;
      const itemSize = 32;
      if (
        st.playerX + playerSize / 2 > item.x &&
        st.playerX - playerSize / 2 < item.x + itemSize &&
        st.playerY + playerSize / 2 > item.y &&
        st.playerY - playerSize / 2 < item.y + itemSize
      ) {
        item.collected = true;

        const ing = this.cakeIngredients.find(i => i.name === item.char);
        if (ing) {
          if (ing.name === 'candle') this.collectedCandles++;
          else this.collectIngredient(ing);
        }
      }
    }

    st.letters = st.letters.filter(l => l.x + 32 > 0 && !l.collected);

    // --- проверка на финальный экран ---
    const candlesOnField = st.letters.some(l => l.char === 'candle' && !l.collected);
    const allIngredientsCollected = this.collectedIngredients.length === this.cakeIngredients.filter(i => i.name !== 'candle').length;

    if (allIngredientsCollected && this.collectedCandles >= this.candlesCount && !candlesOnField) {
      if (this.showFinalTimer == null) this.showFinalTimer = 0;
      else {
        this.showFinalTimer += dtSec;
        if (this.showFinalTimer >= 1) { // 1 секунда задержки
          this.showFinalCake();
          this.showFinalTimer = null;
        }
      }
    } else {
      this.showFinalTimer = null;
    }

    // --- плавная анимация появления ---
    if (st.isFinalCakeShown && this.finalCakeOpacity < 1) {
      this.finalCakeOpacity += dtSec; // скорость появления
      if (this.finalCakeOpacity > 1) this.finalCakeOpacity = 1;
    }
  }

  jump() {
    if (this.state.isGameOver || !this.isGameStarted) return;
    this.state.velocity = -this.state.jumpPower;
  }

  reset() {
    const { width, height } = this.state;
    this.init(width, height);
    this.isGameStarted = true;
  }

  private addObstacle() {
    if (this.state.isFinalCakeShown) return;

    const { width, height } = this.state;
    const gapHeight = 180;
    const minY = 50;
    const maxY = height - gapHeight - 50;
    const gapY = Math.random() * (maxY - minY) + minY;

    const coinLogos = this.getCoinLogos();
    const coinSize = 32;

    const topCount = Math.floor(gapY / coinSize);
    const bottomCount = Math.floor((height - (gapY + gapHeight)) / coinSize);

    const topStack: CoinLogo[] = [];
    for (let i = 0; i < topCount; i++) {
      const logo = coinLogos[Math.floor(Math.random() * coinLogos.length)];
      topStack.push(logo);
    }

    const bottomStack: CoinLogo[] = [];
    for (let i = 0; i < bottomCount; i++) {
      const logo = coinLogos[Math.floor(Math.random() * coinLogos.length)];
      bottomStack.push(logo);
    }

    const newObs: Obstacle = {
      x: width,
      gapY,
      width: 60,
      gapHeight,
      coinLogosTop: topStack,
      coinLogosBottom: bottomStack
    };

    this.state.obstacles.push(newObs);

    const collectedIngCount = this.collectedIngredients.length;
    const totalIngCount = this.cakeIngredients.filter(i => i.name !== 'candle').length;
    const candlesOnField = this.state.letters.filter(l => l.char === 'candle' && !l.collected).length;

    if (collectedIngCount < totalIngCount) this.addIngredientInObstacle(newObs);
    else if (this.collectedCandles < this.candlesCount && candlesOnField === 0) this.addCandleInObstacle(newObs);
  }

  private addIngredientInObstacle(obs: Obstacle) {
    const nextIngredient = this.cakeIngredients.find(ing => !this.collectedIngredients.includes(ing));
    if (!nextIngredient) return;

    const x = obs.x + obs.width / 2 - 16;
    const y = obs.gapY + obs.gapHeight / 2 - 16;

    this.state.letters.push({ x, y, char: nextIngredient.name, collected: false });
  }

  private addCandleInObstacle(obs: Obstacle) {
    if (this.collectedCandles >= this.candlesCount) return;

    const x = obs.x + obs.width / 2 - 16;
    const y = obs.gapY + obs.gapHeight / 2 - 16;

    this.state.letters.push({ x, y, char: 'candle', collected: false });
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

}
