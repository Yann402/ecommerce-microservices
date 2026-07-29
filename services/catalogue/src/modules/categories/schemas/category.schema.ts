import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'crypto';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({
  collection: 'categories',
  timestamps: { createdAt: 'dateCreation', updatedAt: 'dateMiseAJour' },
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, any>) => {
      ret.id = ret._id;
      delete ret._id;
      return ret;
    },
  },
})
export class Category {
  @Prop({ type: String, default: () => randomUUID() })
  _id: string;

  // Nom unique : deux catégories ne peuvent pas porter le même libellé.
  @Prop({ required: true, unique: true, trim: true })
  nom: string;

  @Prop({ default: '' })
  description: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
