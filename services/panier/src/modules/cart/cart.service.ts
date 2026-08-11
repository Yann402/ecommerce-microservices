import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { CatalogueClient } from '../catalogue/catalogue.client';
import { Cart, CartItem } from './interfaces/cart.interface';

@Injectable()
export class CartService {
  private readonly ttl: number;

  constructor(
    private readonly redis: RedisService,
    private readonly catalogue: CatalogueClient,
    config: ConfigService,
  ) {
    this.ttl = Number(config.get('CART_TTL_SECONDS') ?? 604800); // 7 jours
  }

  private key(userId: string): string {
    return `cart:${userId}`;
  }

  private async getCartRaw(userId: string): Promise<Cart> {
    const data = await this.redis.getClient().get(this.key(userId));
    if (!data) return { userId, items: [], dateMiseAJour: null };
    return JSON.parse(data) as Cart;
  }

  // Sauvegarde avec (ré)armement du TTL : chaque action prolonge la vie du panier.
  private async saveCart(userId: string, cart: Cart): Promise<void> {
    cart.dateMiseAJour = new Date().toISOString();
    await this.redis
      .getClient()
      .set(this.key(userId), JSON.stringify(cart), 'EX', this.ttl);
  }

  // Total calculé en CENTIMES entiers pour éviter les erreurs de flottant,
  // puis reformaté. Le prix vient du Catalogue sous forme de chaîne décimale.
  private calculerTotal(items: CartItem[]): string {
    const centimes = items.reduce((acc, it) => {
      const puCentimes = Math.round(parseFloat(it.prixUnitaire) * 100);
      return acc + puCentimes * it.quantite;
    }, 0);
    return (centimes / 100).toFixed(2);
  }

  private decorate(cart: Cart) {
    return {
      ...cart,
      nombreArticles: cart.items.reduce((n, it) => n + it.quantite, 0),
      total: this.calculerTotal(cart.items),
    };
  }

  async getCart(userId: string) {
    return this.decorate(await this.getCartRaw(userId));
  }

  // Ajout d'un article : appel Catalogue via Circuit Breaker (peut lever 503).
  async addItem(userId: string, productId: string, quantite: number) {
    const product = await this.catalogue.getProduct(productId);
    if (!product) throw new NotFoundException(`Produit ${productId} introuvable.`);

    const cart = await this.getCartRaw(userId);
    const existant = cart.items.find((i) => i.productId === productId);

    if (existant) {
      existant.quantite += quantite;
      existant.prixUnitaire = product.prix; // rafraîchit le snapshot de prix
      existant.disponibiliteAConfirmer = product.stock < existant.quantite;
    } else {
      cart.items.push({
        productId: product.id,
        nomProduit: product.nom,
        prixUnitaire: product.prix,
        quantite,
        // fail-open : on ajoute même si le stock semble insuffisant (indicatif)
        disponibiliteAConfirmer: product.stock < quantite,
      });
    }

    await this.saveCart(userId, cart);
    return this.decorate(cart);
  }

  async updateQuantity(userId: string, productId: string, quantite: number) {
    const cart = await this.getCartRaw(userId);
    const item = cart.items.find((i) => i.productId === productId);
    if (!item) throw new NotFoundException(`Article ${productId} absent du panier.`);
    item.quantite = quantite;
    await this.saveCart(userId, cart);
    return this.decorate(cart);
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.getCartRaw(userId);
    const avant = cart.items.length;
    cart.items = cart.items.filter((i) => i.productId !== productId);
    if (cart.items.length === avant) {
      throw new NotFoundException(`Article ${productId} absent du panier.`);
    }
    await this.saveCart(userId, cart);
    return this.decorate(cart);
  }

  // Vidage complet (appelé aussi par Commandes après confirmation — état VIDÉ).
  async clearCart(userId: string) {
    await this.redis.getClient().del(this.key(userId));
    return this.decorate({ userId, items: [], dateMiseAJour: null });
  }
}
