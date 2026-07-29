import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { randomUUID } from 'crypto';

export type ProductDocument = HydratedDocument<Product>;

@Schema({
  collection: 'products',
  // dateCreation / dateMiseAJour renseignées automatiquement par Mongoose.
  timestamps: { createdAt: 'dateCreation', updatedAt: 'dateMiseAJour' },
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, any>) => {
      // On expose 'id' (et non le '_id' interne) et on convertit le
      // Decimal128 en chaîne : la précision monétaire est préservée et
      // l'API ne renvoie pas l'objet Decimal128 brut de Mongo.
      ret.id = ret._id;
      delete ret._id;
      if (ret.prix != null) ret.prix = ret.prix.toString();
      return ret;
    },
  },
})
export class Product {
  // Identifiant UUID (String) plutôt qu'ObjectId Mongo : cohérent avec le
  // service IAM et référençable tel quel par Panier et Commandes, sans
  // trahir l'implémentation de persistance.
  @Prop({ type: String, default: () => randomUUID() })
  _id: string;

  @Prop({ required: true, trim: true })
  nom: string;

  @Prop({ required: true })
  description: string;

  // Prix en Decimal128 (JAMAIS un flottant) : évite les erreurs d'arrondi
  // classiques sur les montants (0.1 + 0.2 ...).
  @Prop({ type: Types.Decimal128, required: true })
  prix: Types.Decimal128;

  // Stock : entier >= 0. C'est la cible du décrément atomique conditionnel
  // qui protège contre le stock négatif (Bug 1).
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  stock: number;

  // Référence (UUID) vers la catégorie : une simple référence, pas un objet
  // imbriqué — conforme au diagramme de classes (Product 0..* --> 1 Category).
  @Prop({ type: String, required: true, index: true })
  categorieId: string;

  // URLs des images hébergées sur Amazon S3. Les fichiers ne sont pas en
  // base : seule la liste d'URLs l'est (ADR-10).
  @Prop({ type: [String], default: [] })
  listeUrlsImages: string[];

  // Suppression logique : un produit "supprimé" passe actif=false. Il sort
  // des listes publiques mais reste référencable par les commandes déjà
  // passées (intégrité historique).
  @Prop({ type: Boolean, default: true, index: true })
  actif: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Index composé : la liste publique filtre par catégorie et sur actif=true.
ProductSchema.index({ categorieId: 1, actif: 1 });
