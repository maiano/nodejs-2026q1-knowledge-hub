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

import { ArticleService } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { FilterArticleDto } from './dto/filter-article.dto';

@Controller('article')
export class ArticleController {
  constructor(private readonly service: ArticleService) {}

  @Get()
  findAll(@Query() query: FilterArticleDto) {
    const hasFilters =
      query.status !== undefined ||
      query.categoryId !== undefined ||
      query.tag !== undefined;

    const hasPagination =
      query.page !== undefined ||
      query.limit !== undefined ||
      query.sortBy !== undefined ||
      query.order !== undefined;

    if (hasFilters && !hasPagination) {
      return this.service.findFiltered(query).data;
    }

    if (hasFilters || hasPagination) {
      return this.service.findFiltered(query);
    }

    return this.service.findAll();
  }

  @Get(':id')
  findById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateArticleDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateArticleDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', new ParseUUIDPipe()) id: string) {
    this.service.delete(id);
  }
}
