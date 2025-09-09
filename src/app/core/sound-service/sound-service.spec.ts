import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SoundService } from './sound-service';

describe('SoundService', () => {
  let component: SoundService;
  let fixture: ComponentFixture<SoundService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SoundService]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SoundService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
