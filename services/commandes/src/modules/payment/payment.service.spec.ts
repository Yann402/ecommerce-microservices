import { PaymentService } from './payment.service';
import { ConfigService } from '@nestjs/config';

const make = (mode: string) => new PaymentService({ get: () => mode } as unknown as ConfigService);

describe('PaymentService (mock configurable)', () => {
  it('always_success : paiement accepté', async () => {
    const r = await make('always_success').pay('100.00');
    expect(r.success).toBe(true);
    expect(r.transactionId).toBeDefined();
  });

  it('always_fail : paiement refusé', async () => {
    const r = await make('always_fail').pay('100.00');
    expect(r.success).toBe(false);
  });

  it('mode inconnu : succès par défaut', async () => {
    const r = await make('n_importe_quoi').pay('50.00');
    expect(r.success).toBe(true);
  });
});
