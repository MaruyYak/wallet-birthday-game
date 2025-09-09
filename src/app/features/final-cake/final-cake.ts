import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { Ingredient } from '../../core/game-engine.service';

@Component({
  selector: 'app-final-cake',
  templateUrl: './final-cake.html',
  styleUrls: ['./final-cake.scss'],
  imports: [CommonModule]
})

export class FinalCakeComponent implements OnChanges {
  @Input() ingredients: Ingredient[] = [];
  @Input() visible = false;
  @Output() restart = new EventEmitter<void>();

  bowlImg = 'assets/cake/bowl.png';
  cakeImg = 'assets/cake/cake.png';
  falling: Ingredient[] = [];
  
  showCake = false;
  showBowlShake = false; // <-- добавили

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue) {
      this.startAnimation();
    }
  }

  private startAnimation() {
    this.showCake = false;
    this.showBowlShake = false;
    this.falling = [];

    // имитация падения ингредиентов
    this.ingredients.forEach((ing, i) => {
      setTimeout(() => this.falling.push(ing), i * 600);
    });

    // после падения всех ингредиентов включаем тряску миски
    setTimeout(() => {
      this.showBowlShake = true;

      setTimeout(() => {
        this.showBowlShake = false;
        this.showCake = true;
      }, 1000);

    }, this.ingredients.length * 600);
  }

  onRestart() {
    this.restart.emit();
  }
}
