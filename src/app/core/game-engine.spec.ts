import { TestBed } from '@angular/core/testing';

import { GameEngineService } from './game-engine.service';

describe('GameEngine', () => {
  let service: GameEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GameEngineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
