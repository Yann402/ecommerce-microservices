import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  // GET /api/v1/categories — PUBLIC : un visiteur voit les catégories pour
  // filtrer le catalogue.
  @Get()
  async lister() {
    return this.categories.lister();
  }

  // POST /api/v1/categories — réservé ADMIN_METIER.
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN_METIER')
  async creer(@Body() dto: CreateCategoryDto) {
    return this.categories.creer(dto);
  }
}
