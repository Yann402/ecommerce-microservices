import {
  Body, Controller, Delete, Get, Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateQuantityDto } from './dto/update-quantity.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserId } from '../../common/decorators/user-id.decorator';

// Toutes les routes sont protégées : chaque client gère SON panier (userId du JWT).
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  async get(@UserId() userId: string) {
    return this.cart.getCart(userId);
  }

  @Post('items')
  async addItem(@UserId() userId: string, @Body() dto: AddItemDto) {
    return this.cart.addItem(userId, dto.productId, dto.quantite);
  }

  @Patch('items/:productId')
  async updateQuantity(
    @UserId() userId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateQuantityDto,
  ) {
    return this.cart.updateQuantity(userId, productId, dto.quantite);
  }

  @Delete('items/:productId')
  async removeItem(
    @UserId() userId: string,
    @Param('productId') productId: string,
  ) {
    return this.cart.removeItem(userId, productId);
  }

  @Delete()
  async clear(@UserId() userId: string) {
    return this.cart.clearCart(userId);
  }
}
