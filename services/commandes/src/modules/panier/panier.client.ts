import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CircuitBreaker from 'opossum';

export interface PanierItem {
  productId: string; nomProduit: string; prixUnitaire: string; quantite: number;
}
export interface Panier { items: PanierItem[]; total: string; }

// Appel SYNCHRONE Commandes -> Panier, protégé par Circuit Breaker (Bug 2).
@Injectable()
export class PanierClient {
  private readonly logger = new Logger(PanierClient.name);
  private readonly baseUrl: string;
  private readonly breaker: CircuitBreaker<[string], Panier>;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('PANIER_URL') ?? 'http://localhost:3003';
    this.breaker = new CircuitBreaker((jwt: string) => this.fetchPanier(jwt), {
      timeout: Number(this.config.get('CB_TIMEOUT_MS') ?? 3000),
      errorThresholdPercentage: Number(this.config.get('CB_ERROR_THRESHOLD_PCT') ?? 50),
      resetTimeout: Number(this.config.get('CB_RESET_TIMEOUT_MS') ?? 10000),
    });
    this.breaker.on('open', () => this.logger.warn('Circuit Panier OUVERT'));
  }

  private async fetchPanier(jwt: string): Promise<Panier> {
    const res = await fetch(`${this.baseUrl}/api/v1/cart`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (!res.ok) throw new Error(`Panier a répondu ${res.status}`);
    return (await res.json()) as Panier;
  }

  async getPanier(jwt: string): Promise<Panier> {
    try {
      return await this.breaker.fire(jwt);
    } catch (err) {
      this.logger.warn(`Appel Panier en échec : ${(err as Error).message}`);
      throw new ServiceUnavailableException('Le service Panier est momentanément indisponible.');
    }
  }
}
