import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WalletFlappy } from './wallet-flappy';

describe('WalletFlappy', () => {
  let component: WalletFlappy;
  let fixture: ComponentFixture<WalletFlappy>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalletFlappy]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WalletFlappy);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
