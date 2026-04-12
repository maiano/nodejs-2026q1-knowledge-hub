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
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';

import { ArticleService } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { FilterArticleDto } from './dto/filter-article.dto';
import { ArticleResponseDto } from './dto/article-response.dto';
import { getPaginatedResponseSchema } from '../common/swagger/paginated-response.schema';

@Controller('article')
@ApiTags('Articles')
@ApiExtraModels(ArticleResponseDto)
export class ArticleController {
  constructor(private readonly service: ArticleService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all articles',
    description:
      'Returns a plain array when only basic listing or filtering is used without pagination. Returns a paginated object when pagination params are provided.',
  })
  @ApiOkResponse({
    description: 'Articles list or paginated articles list',
    schema: {
      oneOf: [
        {
          type: 'array',
          items: { $ref: getSchemaPath(ArticleResponseDto) },
        },
        getPaginatedResponseSchema(ArticleResponseDto),
      ],
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid filtering, pagination, or sorting query',
  })
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
  @ApiOperation({ summary: 'Get article by id' })
  @ApiParam({
    name: 'id',
    description: 'Article identifier',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Article found',
    type: ArticleResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid article id format' })
  @ApiNotFoundResponse({ description: 'Article was not found' })
  findById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create article' })
  @ApiCreatedResponse({
    description: 'Article created successfully',
    type: ArticleResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  create(@Body() dto: CreateArticleDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update article' })
  @ApiParam({
    name: 'id',
    description: 'Article identifier',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Article updated successfully',
    type: ArticleResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid article id or request body' })
  @ApiNotFoundResponse({ description: 'Article was not found' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateArticleDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete article' })
  @ApiParam({
    name: 'id',
    description: 'Article identifier',
    format: 'uuid',
  })
  @ApiNoContentResponse({ description: 'Article deleted successfully' })
  @ApiBadRequestResponse({ description: 'Invalid article id format' })
  @ApiNotFoundResponse({ description: 'Article was not found' })
  delete(@Param('id', new ParseUUIDPipe()) id: string) {
    this.service.delete(id);
  }
}
