import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PanierClient } from '../panier/panier.client';
import { PaymentService } from '../payment/payment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, PanierClient, PaymentService, JwtAuthGuard],
})
export class OrdersModule {}
