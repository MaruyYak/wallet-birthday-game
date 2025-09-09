import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameEngineService } from '../../core/game-engine.service';
import { StartScreenComponent } from './start-screen/start-screen';

@Component({
  selector: 'app-wallet-flappy',
  standalone: true,
  imports: [CommonModule, StartScreenComponent],
  templateUrl: './wallet-flappy.html',
  styleUrls: ['./wallet-flappy.scss'],
})


export class WalletFlappy implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private lastTime = 0;
  private graphTimer = 0;
  private finalButton: { x: number; y: number; width: number; height: number } | null = null;

  private telegramImg: HTMLImageElement | null = null;

  // для графика
  private graphPoints: number[] = [];
  private graphMaxPoints = 150;

  constructor(public engine: GameEngineService, private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    // ничего не инициализируем до нажатия Start — canvas создаётся после старта
  }

  ngOnDestroy(): void {
    this.stopLoop();
    try {
      this.canvasRef?.nativeElement?.removeEventListener('pointerdown', this.onPointerDown);
    } catch {}
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space') {
      e.preventDefault();
      this.handleAction();
    }
  }

  private onPointerDown = (event: PointerEvent) => {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    this.handleAction(x, y);
  };

  // вызывается из start-screen
  async onStartGame() {
    await this.engine.loadCoinLogos(); // подгружаем все изображения
    await this.engine.loadCakeIngredients();

    this.engine.startGame();
    this.cdr.detectChanges();
    setTimeout(() => this.initCanvas(), 0);
  }

  private initCanvas() {
    if (typeof window === 'undefined') return; // SSR

    // если уже были — остановим
    this.stopLoop();
    // canvas должен быть в DOM (rendered)
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      console.warn('Canvas not found during initCanvas');
      return;
    }

    canvas.width = 400;
    canvas.height = 600;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    // инициализация движка с реальными размерами
    this.engine.init(canvas.width, canvas.height);

    // graph points
    this.graphPoints = [];
    for (let i = 0; i < this.graphMaxPoints; i++) {
      this.graphPoints.push(canvas.height / 2);
    }

    // картинка игрока
    this.telegramImg = new Image();
    this.telegramImg.src = 'assets/wallet.png';

    // события
    canvas.addEventListener('pointerdown', this.onPointerDown);

    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private handleAction(clickX?: number, clickY?: number){
    const st = this.engine.state;
    if (st.isFinalCakeShown && clickX != null && clickY != null && this.finalButton) {
        const btn = this.finalButton;
        if (
          clickX >= btn.x &&
          clickX <= btn.x + btn.width &&
          clickY >= btn.y &&
          clickY <= btn.y + btn.height
        ) {
          this.engine.reset();
          this.resetGraph();
          this.finalButton = null;
        }
      return;
    }
      if (st.isGameOver) {
      this.engine.reset();
      this.resetGraph();
      return;
    }

    this.engine.jump();
  }

  private loop = (now: number) => {
    if (typeof window === 'undefined') return;
    const dtSec = Math.min((now - this.lastTime) / 1000, 0.033);
    this.lastTime = now;

    this.engine.update(dtSec);
    this.updateGraph(dtSec);
    this.draw();

    this.animationId = requestAnimationFrame(this.loop);
  };

  private stopLoop() {
    if (this.animationId != null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private draw() {
    const ctx = this.ctx;
    const st = this.engine.state;
    const { width, height, playerX, playerY, obstacles, letters, isGameOver, isFinalCakeShown, velocity } = st;

    // фон + график
    this.drawBackgroundGraph();

    // финальный торт (если показан) — рисуем и выходим
  if (isFinalCakeShown) {
    ctx.save();
    ctx.globalAlpha = this.engine.finalCakeOpacity;
    ctx.fillStyle = '#eeeeeeff';
    ctx.font = 'bold 28px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.textAlign = 'center';
    ctx.fillText('🎂 Happy Birthday 🎂', width / 2, height / 2 - 40);

    // кнопка "Celebrate Again"
    const buttonWidth = 180;
    const buttonHeight = 50;
    const buttonX = width / 2 - buttonWidth / 2;
    const buttonY = height / 2 + 60;

    // кнопка
    ctx.fillStyle = '#00ffc8';
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

    // текст кнопки
    ctx.fillStyle = '#0b0f2c';
    ctx.font = 'bold 18px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText('Celebrate Again', width / 2, buttonY + buttonHeight / 2 + 6);

    // сохраняем координаты кнопки для обработки клика
    this.finalButton = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };

    ctx.textAlign = 'start';
    return; // останавливаем рисование игрока и препятствий
  }

    // --- игрок (Telegram) ---
    if (this.telegramImg && this.telegramImg.complete && this.telegramImg.naturalWidth > 0) {
      const size = 42;
      const maxAngle = Math.PI / 4;
      const minAngle = -Math.PI / 6;
      const angle = Math.max(Math.min(velocity / 800, maxAngle), minAngle);

      ctx.save();
      ctx.translate(playerX, playerY);
      ctx.rotate(angle);
      ctx.drawImage(this.telegramImg, -size / 2, -size / 2, size, size);
      ctx.restore();
    } else {
      const size = 32;
      ctx.fillStyle = '#2b6cb0';
      const maxAngle = Math.PI / 6;
      const minAngle = -Math.PI / 6;
      const angle = Math.max(Math.min(velocity / 800, maxAngle), minAngle);

      ctx.save();
      ctx.translate(playerX, playerY);
      ctx.rotate(angle);
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.restore();
    }

    this.drawChecklist(ctx);

  // препятствия — стопки монет с оболочкой
  for (const obs of obstacles) {
    const coinSize = 32;
    const gapY = obs.gapY;
    const bottomY = gapY + obs.gapHeight;

    const framePadding = 6; // отступ вокруг стопки
    const frameColor = 'rgba(255, 255, 255, 0.36)'; // лёгкая прозрачная рамка
    const frameRadius = 8; // скругление углов

    // верхняя стопка рамка
    if (obs.coinLogosTop.length > 0) {
      const frameHeight = obs.coinLogosTop.length * coinSize + framePadding * 2;
      ctx.fillStyle = frameColor;
      ctx.beginPath();
      ctx.roundRect(
        obs.x + obs.width / 2 - coinSize / 2 - framePadding,
        0 - framePadding, // верхняя рамка от самого верха канваса
        coinSize + framePadding * 2,
        frameHeight,
        frameRadius
      );
      ctx.fill();
    }

    // верхняя стопка монет
    obs.coinLogosTop.forEach((logo, i) => {
      if (logo.img.complete) {
        ctx.drawImage(
          logo.img,
          obs.x + obs.width / 2 - coinSize / 2,
          i * coinSize,
          coinSize,
          coinSize
        );
      }
    });

    // нижняя стопка рамка
    if (obs.coinLogosBottom.length > 0) {
      const frameHeight = obs.coinLogosBottom.length * coinSize + framePadding * 2;
      ctx.fillStyle = frameColor;
      ctx.beginPath();
      ctx.roundRect(
        obs.x + obs.width / 2 - coinSize / 2 - framePadding,
        bottomY - framePadding,
        coinSize + framePadding * 2,
        frameHeight,
        frameRadius
      );
      ctx.fill();
    }

    // нижняя стопка монет
    obs.coinLogosBottom.forEach((logo, i) => {
      if (logo.img.complete) {
        ctx.drawImage(
          logo.img,
          obs.x + obs.width / 2 - coinSize / 2,
          bottomY + i * coinSize,
          coinSize,
          coinSize
        );
      }
    });
  }


    // ингредиенты и свечи (на игровом поле)
    for (const item of letters) {
      if (!item.collected) {
        const ing = this.engine.getAllCakeIngredients().find(i => i.name === item.char);
        if (ing?.img.complete) {
          ctx.drawImage(ing.img, item.x, item.y, 40, 40);
        }
      }
    }
     // Game Over overlay
    if (isGameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', width / 2, height / 2 - 10);
      ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.fillText('Tap/Space — restart', width / 2, height / 2 + 20);
      ctx.textAlign = 'start';
    }
  }

  private drawChecklist(ctx: CanvasRenderingContext2D) {
    const ingredients = this.engine.getAllCakeIngredients().filter(i => i.name !== 'candle');
    const collectedIngredients = this.engine.getCollectedIngredients();

    const padding = 12;
    let x = padding;
    const y = 20;
    const size = 24;

    // --- обычные ингредиенты ---
    for (const ing of ingredients) {
      const isCollected = collectedIngredients.includes(ing);
      ctx.globalAlpha = isCollected ? 1 : 0.4;
      if (ing.img.complete) ctx.drawImage(ing.img, x, y, size, size);
      x += size + 8;
    }

    // --- свечи ---
    const candleIngredient = this.engine.getAllCakeIngredients().find(i => i.name === 'candle');
    if (candleIngredient) {
      for (let i = 0; i < this.engine.candlesCount; i++) {
        const isCollected = i < this.engine.collectedCandles;
        ctx.globalAlpha = isCollected ? 1 : 0.4;
        if (candleIngredient.img.complete) ctx.drawImage(candleIngredient.img, x, y, size, size);
        x += size + 8;
      }
    }

    ctx.globalAlpha = 1;
}



  private resetGraph() {
    this.graphPoints = [];
    const h = this.engine.state.height;
    for (let i = 0; i < this.graphMaxPoints; i++) this.graphPoints.push(h / 2);
  }

  private updateGraph(dtSec: number) {
    this.graphTimer += dtSec;
    if (this.graphTimer < 0.009) return;
    this.graphTimer = 0;

    const { height } = this.engine.state;
    this.graphPoints.shift();
    const last = this.graphPoints[this.graphPoints.length - 1] ?? height / 2;
    const newY = Math.min(Math.max(last + (Math.random() - 0.5) * 20, 50), height - 50);
    this.graphPoints.push(newY);
  }

  private drawBackgroundGraph() {
    const ctx = this.ctx;
    const { width, height } = this.engine.state;

    // градиентный фон
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0b0f2c');
    gradient.addColorStop(1, '#1a1f4c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // тонкая сетка
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // график
    ctx.beginPath();
    const step = width / (this.graphMaxPoints - 1);
    this.graphPoints.forEach((y, i) => {
      const x = i * step;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.save();
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0,255,200,0.4)';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#00ffc8';
    ctx.stroke();
    ctx.restore();

    // заполнение под графиком
    ctx.beginPath();
    ctx.moveTo(0, this.graphPoints[0]);
    this.graphPoints.forEach((y, i) => ctx.lineTo(i * step, y));
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const fillGradient = ctx.createLinearGradient(0, 0, 0, height);
    fillGradient.addColorStop(0, 'rgba(0, 255, 200, 0.12)');
    fillGradient.addColorStop(1, 'rgba(0, 255, 200, 0)');
    ctx.fillStyle = fillGradient;
    ctx.fill();
  }
}
