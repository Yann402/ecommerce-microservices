import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // Configuration (.env) disponible partout.
    ConfigModule.forRoot({ isGlobal: true }),

    // Connexion MongoDB pilotée par la variable MONGODB_URI.
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),

    // JwtModule global : nécessaire aux gardes (JwtAuthGuard vérifie la
    // signature du jeton). Le secret n'est PAS fixé ici — il est passé
    // explicitement à verifyAsync() par la garde, lu depuis ConfigService.
    JwtModule.register({ global: true }),

    ProductsModule,
    CategoriesModule,
    HealthModule,
  ],
})
export class AppModule {}
