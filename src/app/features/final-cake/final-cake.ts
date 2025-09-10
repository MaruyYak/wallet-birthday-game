import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { Ingredient } from '../../core/game-engine.service';
import { SoundService } from '../../core/sound-service/sound-service';

@Component({
  selector: 'app-final-cake',
  templateUrl: './final-cake.html',
  styleUrls: ['./final-cake.scss'],
  imports: [CommonModule]
})

export class FinalCakeComponent implements OnChanges, AfterViewInit {
  @Input() ingredients: Ingredient[] = [];
  @Input() visible = false;
  @Output() restart = new EventEmitter<void>();

  bowlImg = 'assets/cake/bowl.png';
  cakeImg = 'assets/cake/cake.png';
  falling: Ingredient[] = [];
  showCake = false;
  showBowlShake = false;
  showBowl = true;

  isBrowser = false;

  // новое: состояние свечей
  candles = [
    { name: 'red', png: 'assets/cake/red.png', blown: false },
    { name: 'green', png: 'assets/cake/green.png', blown: false },
    { name: 'pink', png: 'assets/cake/pink.png', blown: false },
    { name: 'blue', png: 'assets/cake/blue.png', blown: false }
  ];

  constructor(
    private soundService: SoundService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      this.soundService.loadAllSounds();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue) {
      this.startAnimation();
    }
  }

  private startAnimation() {
    this.showCake = false;
    this.falling = [];

    this.candles.forEach(c => c.blown = false); // сброс свечей

    this.ingredients.forEach((ing, i) => {
      setTimeout(() => this.falling.push(ing), i * 600);
    });

    setTimeout(() => {
      this.showFinalCakeSequence();
    }, this.ingredients.length * 600 + 100);
  }

  showFinalCakeSequence() {
    this.showBowlShake = true;
    setTimeout(() => {
      this.showBowl = false;
    }, 1800);
    if (this.isBrowser) this.soundService.play('bowlShake');

    setTimeout(() => {
      this.showBowlShake = false;
      this.showCake = true;
      if (this.isBrowser) this.soundService.play('cakeAppear');
    }, 1500);
  }

  // новое: клик по свече
  blowCandle(candle: any) {
    if (!candle.blown) {
      candle.blown = true;
      if (this.isBrowser) this.soundService.play('candleBlow');
    }
  }

  onRestart() {
    if (this.isBrowser) {
      this.soundService.stop('cakeAppear');
      this.soundService.stop('bowlShake');
    }

    this.restart.emit();
  }
}
