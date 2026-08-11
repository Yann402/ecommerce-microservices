import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CatalogueClient } from '../catalogue/catalogue.client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Module({
  controllers: [CartController],
  providers: [CartService, CatalogueClient, JwtAuthGuard],
  exports: [CartService],
})
export class CartModule {}
