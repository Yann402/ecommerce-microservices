import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../../rabbitmq/rabbitmq.service';
import { CartService } from '../cart/cart.service';

// Fin de Saga : quand une commande est confirmée, on vide le panier du client
// (état VIDÉ du diagramme d'états). Le userId vient des headers (Bug 3).
@Injectable()
export class CartConsumer implements OnModuleInit {
  private readonly logger = new Logger(CartConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly cart: CartService,
  ) {}

  async onModuleInit() {
    await this.rabbitmq.consume(
      'q.panier.commande-confirmee',
      ['commande.confirmee'],
      async (_content, headers) => {
        const userId = headers?.userId as string | undefined;
        if (userId) {
          await this.cart.clearCart(userId);
          this.logger.log(`Panier de ${userId} vidé (commande confirmée)`);
        }
      },
    );
  }
}
