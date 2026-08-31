import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  // ---- Routes PUBLIQUES (aucun JWT) ----

  @Get() // GET /api/v1/products (F-2.2.a)
  async lister(@Query() query: QueryProductsDto) {
    return this.products.lister(query);
  }

  @Get(':id') // GET /api/v1/products/:id (F-2.2.b)
  async detail(@Param('id') id: string) {
    return this.products.trouverParId(id);
  }

  // ---- Routes ADMIN (JWT + rôle ADMIN_METIER) — F-2.2.d ----

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN_METIER')
  async creer(@Body() dto: CreateProductDto) {
    return this.products.creer(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN_METIER')
  async mettreAJour(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.mettreAJour(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN_METIER')
  async supprimer(@Param('id') id: string) {
    return this.products.supprimer(id);
  }
}
