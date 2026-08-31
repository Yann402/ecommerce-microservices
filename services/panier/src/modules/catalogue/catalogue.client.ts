import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CircuitBreaker from 'opossum';

export interface CatalogueProduct {
  id: string;
  nom: string;
  prix: string;
  stock: number;
}

// Appel SYNCHRONE Panier -> Catalogue, protégé par un Circuit Breaker (Bug 2).
// - produit trouvé          -> retour du produit
// - produit inexistant (404)-> retour null (PAS un échec : ne fait pas ouvrir le circuit)
// - Catalogue lent/injoignable/5xx / circuit ouvert -> 503 (fail-fast, pas de cascade)
@Injectable()
export class CatalogueClient {
  private readonly logger = new Logger(CatalogueClient.name);
  private readonly baseUrl: string;
  private readonly breaker: CircuitBreaker<[string], CatalogueProduct | null>;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('CATALOGUE_URL') ?? 'http://localhost:3002';

    this.breaker = new CircuitBreaker((id: string) => this.fetchProduct(id), {
      timeout: Number(this.config.get('CB_TIMEOUT_MS') ?? 3000),
      errorThresholdPercentage: Number(this.config.get('CB_ERROR_THRESHOLD_PCT') ?? 50),
      resetTimeout: Number(this.config.get('CB_RESET_TIMEOUT_MS') ?? 10000),
    });

    this.breaker.on('open', () =>
      this.logger.warn('Circuit Catalogue OUVERT — appels court-circuités'),
    );
    this.breaker.on('halfOpen', () => this.logger.log('Circuit Catalogue en test (half-open)'));
    this.breaker.on('close', () => this.logger.log('Circuit Catalogue refermé'));
  }

  // Appel HTTP brut. 404 -> null (réponse valide). Autre erreur -> throw (compte
  // comme un échec pour le Circuit Breaker).
  private async fetchProduct(id: string): Promise<CatalogueProduct | null> {
    const res = await fetch(`${this.baseUrl}/api/v1/products/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Catalogue a répondu ${res.status}`);
    return (await res.json()) as CatalogueProduct;
  }

  // Point d'entrée utilisé par le service Panier.
  async getProduct(id: string): Promise<CatalogueProduct | null> {
    try {
      return await this.breaker.fire(id);
    } catch (err) {
      // Circuit ouvert, timeout ou erreur réseau -> échec rapide (503).
      this.logger.warn(`Appel Catalogue en échec : ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        'Le service Catalogue est momentanément indisponible. Réessayez plus tard.',
      );
    }
  }
}
