/**
 * Script de peuplement du catalogue (dev).
 * Lancement :  npm run seed
 * Requiert MongoDB accessible (docker-compose) sur MONGODB_URI
 * (défaut : mongodb://localhost:27017/catalogue).
 */
import 'reflect-metadata';
import { connect, disconnect, model } from 'mongoose';
import { ProductSchema } from '../src/modules/products/schemas/product.schema';
import { CategorySchema } from '../src/modules/categories/schemas/category.schema';

async function main() {
  const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/catalogue';
  await connect(uri);

  const Category = model('Category', CategorySchema);
  const Product = model('Product', ProductSchema);

  await Product.deleteMany({});
  await Category.deleteMany({});

  const tel = await Category.create({
    nom: 'Téléphonie', description: 'Smartphones et accessoires',
  });
  const acc = await Category.create({
    nom: 'Accessoires', description: 'Coques, chargeurs, câbles',
  });

  await Product.create([
    { nom: 'Smartphone Galaxy A55 128Go', description: 'Écran 6.6", 5000 mAh',
      prix: 399.0, stock: 27, categorieId: tel._id, listeUrlsImages: [] },
    { nom: 'Coque silicone Galaxy A55', description: 'Protection souple',
      prix: 14.5, stock: 120, categorieId: acc._id, listeUrlsImages: [] },
    { nom: 'Chargeur USB-C 25W', description: 'Charge rapide',
      prix: 19.9, stock: 60, categorieId: acc._id, listeUrlsImages: [] },
  ]);

  // eslint-disable-next-line no-console
  console.log('Seed OK : 2 catégories, 3 produits insérés.');
  await disconnect();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
