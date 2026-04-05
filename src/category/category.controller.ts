import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginationSortDto } from '../common/dto/pagination-sort.dto';

function hasQueryParams(query: PaginationSortDto): boolean {
  return (
    query.page !== undefined ||
    query.limit !== undefined ||
    query.sortBy !== undefined ||
    query.order !== undefined
  );
}

@Controller('category')
export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  @Get()
  findAll(@Query() query: PaginationSortDto) {
    const hasPagination = hasQueryParams(query);

    if (!hasPagination) {
      return this.service.findAll();
    }

    return this.service.findPaginated({
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      sortBy: query.sortBy,
      order: query.order ?? 'asc',
    });
  }

  @Get(':id')
  findById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', new ParseUUIDPipe()) id: string) {
    this.service.delete(id);
  }
}
