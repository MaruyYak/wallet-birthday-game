import { Component } from '@angular/core';
import { WalletFlappy } from './features/wallet-flappy/wallet-flappy';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [WalletFlappy],   // <-- добавили сюда
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
