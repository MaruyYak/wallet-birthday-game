import { Injectable } from '@angular/core';
import { SoundService } from './sound-service/sound-service';

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  size: number;   
  logo: CoinLogo;
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
  items: Letter[];
  isFinalCakeShown: boolean;
}

export interface Ingredient {
  name: string;
  img: HTMLImageElement;
}

@Injectable({ providedIn: 'root' })
export class GameEngineService {

constructor(private soundService: SoundService) {
  if (typeof window !== 'undefined') {
    this.soundService.loadAllSounds();
  }
}


state!: GameState;

public isGameStarted = false;
private coinLogos: CoinLogo[] = [];
private cakeIngredients: Ingredient[] = [];
private collectedIngredients: Ingredient[] = [];
public candlesCount = 4;
public collectedCandles = 0;
private lastJumpTime = 0;

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

// GameEngineService
public forceFinalCake() {
  if (!this.state) return;
  
  // отмечаем финальный экран
  this.state.isFinalCakeShown = true;

  // очищаем поле и препятствия
  this.state.obstacles = [];
  this.state.items = [];

  // можно сбросить таймеры
  this.showFinalTimer = null;

  // для плавной анимации
  this.finalCakeOpacity = 1;
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
      obstacleInterval: 1,
      items: [],
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
      this.state.items = [];
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

    // --- генерация препятствий ---
    st.obstacleTimer += dtSec;
    if (st.obstacleTimer > st.obstacleInterval && !st.isFinalCakeShown) {
      st.obstacleTimer = 0.4;
      this.addObstacle();
    }

    // --- проверка выхода за границы (телепорт) ---
    const playerSize = 32;
    if (st.playerY > st.height) {
      st.playerY = 0 - playerSize / 2; // упал вниз — появляется сверху
    } else if (st.playerY + playerSize < 0) {
      st.playerY = st.height - playerSize / 2; // вылетел вверх — появляется снизу
    }

    // --- движение препятствий ---
    for (let i = st.obstacles.length - 1; i >= 0; i--) {
      const obs = st.obstacles[i];
      obs.x -= obs.speed * dtSec;

      // проверка столкновения
      const playerSize = 32;
      if (
        st.playerX < obs.x + obs.size &&
        st.playerX + playerSize > obs.x &&
        st.playerY < obs.y + obs.size &&
        st.playerY + playerSize > obs.y
      ) {
        st.isGameOver = true;
        this.soundService.play('collision');
      }

      // удаление за экраном
      if (obs.x + obs.size < 0) {
        st.obstacles.splice(i, 1);
        st.score++;
      }
    }

    // --- движение предметов (ингредиенты/свечи) ---
    for (const item of st.items) {
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

        this.soundService.play('ingredientCollect');
      }
    }

    st.items = st.items.filter(l => l.x + 32 > 0 && !l.collected);

    // --- проверка на финальный экран ---
    const allIngredientsCollected = this.collectedIngredients.length === this.cakeIngredients.filter(i => i.name !== 'candle').length;
    const enoughCandles = this.collectedCandles >= this.candlesCount;

    if (allIngredientsCollected && enoughCandles) {
      if (this.showFinalTimer == null) {
        this.showFinalTimer = 0;
      } else {
        this.showFinalTimer += dtSec;
        if (this.showFinalTimer >= 0.5) { 
          this.showFinalCake();
          this.showFinalTimer = null;
        }
      }
    } else {
      this.showFinalTimer = null;
    }
  }


jump() {
  if (!this.state || this.state.isGameOver || !this.isGameStarted || new Date().getTime() - 200 < this.lastJumpTime) return;
  this.lastJumpTime = new Date().getTime();
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
    const coinLogos = this.getCoinLogos();
    const logo = coinLogos[Math.floor(Math.random() * coinLogos.length)];

    const size = 48; // размер монетки с обводкой
    const y = Math.random() * (height - size - 50) + 25;

    const newObs: Obstacle = {
       x: width + 50,       // старт за экраном справа
      y,
      width: 40,           // ширина/высота монетки
      height: 40,
      size: 40,
      speed: 300,          // скорость движения в px/сек
      logo
    };

    this.state.obstacles.push(newObs);

    // шанс добавить ингредиент рядом
    if (Math.random() < 0.5) {
      this.addIngredientNear(newObs);
    }
  }


  private addIngredientNear(obs: Obstacle) {
    const nextIngredient = this.cakeIngredients.find(ing => !this.collectedIngredients.includes(ing));
    if (!nextIngredient) return;

    const offsetX = 80; // чуть впереди монеты
    const offsetY = (Math.random() - 0.5) * 60; // +- немного по вертикали

    const x = obs.x + offsetX;
    const y = obs.y + offsetY;

    this.state.items.push({ x, y, char: nextIngredient.name, collected: false });
  }

  private addCandleNear(obs: Obstacle) {
    if (this.collectedCandles >= this.candlesCount) return;

    const offsetX = 80; // чуть впереди препятствия
    const offsetY = (Math.random() - 0.5) * 60; // случайный сдвиг вверх/вниз

    const x = obs.x + offsetX;
    const y = obs.y + offsetY;

    this.state.items.push({ x, y, char: 'candle', collected: false });
  }


  private showFinalCake() {
    this.state.isFinalCakeShown = true;
    this.state.obstacles = [];
    this.state.items = [];
  }

}
