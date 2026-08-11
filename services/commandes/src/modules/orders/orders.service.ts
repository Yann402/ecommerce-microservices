import {
  BadRequestException, HttpException, HttpStatus, Injectable, Logger,
  NotFoundException, OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RabbitMQService } from '../../rabbitmq/rabbitmq.service';
import { PanierClient } from '../panier/panier.client';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitMQService,
    private readonly panier: PanierClient,
    private readonly payment: PaymentService,
  ) {}

  // Abonnement aux réponses de stock du Catalogue (fin de la Saga).
  async onModuleInit() {
    await this.rabbitmq.consume(
      'q.commandes.stock',
      ['stock.confirme', 'stock.insuffisant'],
      async (content, _headers, routingKey) => {
        if (routingKey === 'stock.confirme') await this.onStockConfirme(content.orderId);
        else await this.onStockInsuffisant(content.orderId, content.productId);
      },
    );
  }

  // --- Création : lit le panier, crée EN_ATTENTE, paie, publie CommandeCréée ---
  async creerCommande(userId: string, jwt: string) {
    const panier = await this.panier.getPanier(jwt); // synchrone + Circuit Breaker
    if (!panier.items?.length) throw new BadRequestException('Le panier est vide.');

    const traceId = randomUUID();

    // Lignes avec nom + prix FIGÉS à l'achat (impératif comptable, ADR).
    const order = await this.prisma.order.create({
      data: {
        userId,
        montantTotal: panier.total,
        lignes: {
          create: panier.items.map((it) => ({
            productId: it.productId,
            nomProduit: it.nomProduit,
            prixUnitaire: it.prixUnitaire,
            quantite: it.quantite,
          })),
        },
      },
      include: { lignes: true },
    });

    // Paiement mock. Refus -> commande ANNULEE + 402.
    const paiement = await this.payment.pay(panier.total);
    if (!paiement.success) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { statut: 'ANNULEE', motifAnnulation: 'Paiement refusé' },
      });
      throw new HttpException('Paiement refusé.', HttpStatus.PAYMENT_REQUIRED);
    }

    // Publication ASYNCHRONE. Bug 3 : userId + traceId dans les headers.
    await this.rabbitmq.publish(
      'commande.creee',
      { orderId: order.id, lignes: order.lignes.map((l) => ({ productId: l.productId, quantite: l.quantite })) },
      { userId, traceId },
    );

    // Réponse immédiate (202) sans attendre le traitement du stock.
    return {
      orderId: order.id,
      statut: order.statut,
      montantTotal: order.montantTotal.toString(),
      message: 'Commande enregistrée, traitement du stock en cours.',
    };
  }

  // --- Fin de Saga : confirmation ---
  private async onStockConfirme(orderId: string) {
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: { statut: 'CONFIRMEE' },
    });
    this.logger.log(`Commande ${orderId} CONFIRMEE`);
    // Déclenche le vidage du panier (consommé par le service Panier).
    await this.rabbitmq.publish('commande.confirmee', { orderId }, { userId: order.userId });
  }

  // --- Fin de Saga : compensation ---
  private async onStockInsuffisant(orderId: string, productId: string) {
    await this.prisma.order.update({
      where: { id: orderId },
      data: { statut: 'ANNULEE', motifAnnulation: `Stock insuffisant (produit ${productId})` },
    });
    this.logger.warn(`Commande ${orderId} ANNULEE — stock insuffisant`);
  }

  // --- Lecture (suivi) ---
  async findAll(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { dateCreation: 'desc' },
      include: { lignes: true },
    });
  }

  async findOne(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: { lignes: true },
    });
    if (!order) throw new NotFoundException(`Commande ${id} introuvable.`);
    return order;
  }
}
