import { Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserId } from '../../common/decorators/user-id.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  // Valide le panier -> crée la commande. 202 : acceptée, stock traité en async.
  @Post()
  @HttpCode(202)
  async create(@UserId() userId: string, @Req() req: Request) {
    const jwt = (req.headers.authorization ?? '').replace('Bearer ', '');
    return this.orders.creerCommande(userId, jwt);
  }

  @Get()
  async findAll(@UserId() userId: string) {
    return this.orders.findAll(userId);
  }

  @Get(':id')
  async findOne(@UserId() userId: string, @Param('id') id: string) {
    return this.orders.findOne(userId, id);
  }
}
