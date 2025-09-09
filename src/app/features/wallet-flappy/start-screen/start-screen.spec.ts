import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StartScreen } from './start-screen';

describe('StartScreen', () => {
  let component: StartScreen;
  let fixture: ComponentFixture<StartScreen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StartScreen]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StartScreen);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
