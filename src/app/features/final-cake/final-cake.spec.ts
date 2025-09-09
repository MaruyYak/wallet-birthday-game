import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinalCake } from './final-cake';

describe('FinalCake', () => {
  let component: FinalCake;
  let fixture: ComponentFixture<FinalCake>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinalCake]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinalCake);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
