// Le panier est stocké en Redis sous forme JSON (clé cart:{userId}).
// productId/userId sont de simples références externes (Database per Service).

export interface CartItem {
  productId: string;
  nomProduit: string;      // capturé depuis le Catalogue à l'ajout (snapshot)
  prixUnitaire: string;    // string : cohérent avec le Decimal128 du Catalogue
  quantite: number;
  disponibiliteAConfirmer?: boolean; // true si stock jugé insuffisant à l'ajout
}

export interface Cart {
  userId: string;
  items: CartItem[];
  dateMiseAJour: string | null;
}
