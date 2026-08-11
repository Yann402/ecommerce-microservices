import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../../rabbitmq/rabbitmq.service';
import { ProductsService } from '../products/products.service';

interface LigneCommande { productId: string; quantite: number; }

// Réaction du Catalogue à l'événement CommandeCréée (Saga chorégraphiée).
// Décrémente atomiquement (Bug 1) ; si une ligne est en rupture, COMPENSE les
// lignes déjà décrémentées puis signale l'insuffisance.
@Injectable()
export class StockConsumer implements OnModuleInit {
  private readonly logger = new Logger(StockConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly products: ProductsService,
  ) {}

  async onModuleInit() {
    await this.rabbitmq.consume(
      'q.catalogue.commande-creee',
      ['commande.creee'],
      async (content, headers) => this.traiter(content, headers),
    );
  }

  private async traiter(
    content: { orderId: string; lignes: LigneCommande[] },
    headers: Record<string, unknown>,
  ) {
    const { orderId, lignes } = content;
    const decrementees: LigneCommande[] = [];

    for (const l of lignes) {
      const ok = await this.products.decrementerStockConditionnel(l.productId, l.quantite);
      if (ok) {
        decrementees.push(l);
      } else {
        // Compensation : on remet le stock des lignes déjà décrémentées.
        for (const d of decrementees) {
          await this.products.incrementerStock(d.productId, d.quantite);
        }
        this.logger.warn(`Commande ${orderId} : rupture sur ${l.productId} -> compensation`);
        // On repropage les headers (userId + traceId) — continuité du contexte (Bug 3).
        await this.rabbitmq.publish('stock.insuffisant', { orderId, productId: l.productId }, headers);
        return;
      }
    }

    this.logger.log(`Commande ${orderId} : stock décrémenté sur toutes les lignes`);
    await this.rabbitmq.publish('stock.confirme', { orderId }, headers);
  }
}
