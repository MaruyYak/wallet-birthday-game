import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameEngineService } from '../../core/game-engine.service';

@Component({
  selector: 'app-wallet-flappy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wallet-flappy.html',
  styleUrls: ['./wallet-flappy.scss'],
})

export class WalletFlappy implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private lastTime = 0;
  private graphTimer = 0;

  private telegramImg: HTMLImageElement | null = null;

  // для графика
  private graphPoints: number[] = [];
  private graphMaxPoints = 150;

  constructor(private engine: GameEngineService) {}

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return; // SSR protection

    const canvas = this.canvasRef.nativeElement;
    canvas.width = 400;
    canvas.height = 600;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.engine.init(canvas.width, canvas.height);

    for (let i = 0; i < this.graphMaxPoints; i++) {
      this.graphPoints.push(canvas.height / 2);
    }

    this.telegramImg = new Image();
    this.telegramImg.src = 'assets/wallet.png';

    canvas.addEventListener('pointerdown', this.onPointerDown);
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  ngOnDestroy(): void {
    this.stopLoop();
    if (this.canvasRef?.nativeElement) {
      this.canvasRef.nativeElement.removeEventListener('pointerdown', this.onPointerDown);
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space') {
      e.preventDefault();
      this.handleAction();
    }
  }

  private onPointerDown = () => this.handleAction();

  private handleAction() {
    const st = this.engine.state;
    if (st.isGameOver || st.isFinalCakeShown) {
      this.engine.reset();
      this.resetGraph();
      return;
    }
    this.engine.jump();
  }

  private loop = (now: number) => {
    if (typeof window === 'undefined') return; // SSR protection
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
  const { width, height, playerX, playerY, score, obstacles, letters, isGameOver, isFinalCakeShown, velocity } = st;

  // фон + график
  this.drawBackgroundGraph();

  // финальный торт
  if (isFinalCakeShown) {
    ctx.fillStyle = '#eeeeeeff';
    ctx.font = 'bold 28px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.textAlign = 'center';
    ctx.fillText('🎂 Happy Birthday 🎂', width / 2, height / 2 - 40);
    ctx.font = '20px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText('🕯️🕯️🕯️🕯️', width / 2, height / 2);
    ctx.textAlign = 'start';
    return; // останавливаем рисование игрока и препятствий
  }

  // игрок (Telegram)
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

  // счёт
  ctx.fillStyle = '#ffffffff';
  ctx.font = 'bold 20px system-ui, -apple-system, Segoe UI, Roboto';
  ctx.fillText(`Score: ${score}`, 16, 32);

  // Game Over
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

  // препятствия — стопки монет
  ctx.font = '24px system-ui, -apple-system, Segoe UI, Roboto';
  ctx.textAlign = 'center';
  for (const obs of obstacles) {
    const coinSize = 24;
    const gapY = obs.gapY;
    const topHeight = gapY;
    const bottomY = gapY + obs.gapHeight;
    const bottomHeight = height - bottomY;

    // верхняя стопка
    for (let y = 0; y < topHeight; y += coinSize) {
      ctx.fillText('💰', obs.x + obs.width / 2, y + coinSize);
    }

    // нижняя стопка
    for (let y = bottomY; y < height; y += coinSize) {
      ctx.fillText('💰', obs.x + obs.width / 2, y + coinSize);
    }
  }

  // ингредиенты и свечи
  ctx.fillStyle = '#e53e3e';
  ctx.font = 'bold 24px system-ui, -apple-system, Segoe UI, Roboto';
  ctx.textAlign = 'center';
  for (const item of letters) {
    if (!item.collected) {
      ctx.fillText(item.char, item.x + 12, item.y + 18);
    }
  }
  ctx.textAlign = 'start';
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
    const last = this.graphPoints[this.graphPoints.length - 1];
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

    // сетка
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
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

    // график с тенью
    ctx.beginPath();
    ctx.moveTo(0, this.graphPoints[0]);
    const step = width / (this.graphMaxPoints - 1);
    this.graphPoints.forEach((y, i) => {
      ctx.lineTo(i * step, y);
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
    fillGradient.addColorStop(0, 'rgba(0, 255, 200, 0.15)');
    fillGradient.addColorStop(1, 'rgba(0, 255, 200, 0)');
    ctx.fillStyle = fillGradient;
    ctx.fill();
  }
}
