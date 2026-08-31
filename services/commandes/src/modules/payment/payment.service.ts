import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Paiement SIMULÉ (le CdC impose un mock). Mode configurable pour la démo :
// always_success | always_fail | random
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly mode: string;

  constructor(config: ConfigService) {
    this.mode = config.get<string>('PAYMENT_MOCK_MODE') ?? 'always_success';
  }

  async pay(montant: string): Promise<{ success: boolean; transactionId?: string }> {
    let success: boolean;
    switch (this.mode) {
      case 'always_fail':
        success = false;
        break;
      case 'random':
        success = Math.random() > 0.3;
        break;
      default:
        success = true;
    }
    this.logger.log(
      `Paiement mock (${this.mode}) de ${montant} -> ${success ? 'accepté' : 'refusé'}`,
    );
    return success ? { success: true, transactionId: `mock-${Date.now()}` } : { success: false };
  }
}
