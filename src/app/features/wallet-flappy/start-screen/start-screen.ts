import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-start-screen',
  standalone: true,
  templateUrl: './start-screen.html',
  styleUrls: ['./start-screen.scss'],
})
export class StartScreenComponent {
  @Output() start = new EventEmitter<void>();
}
