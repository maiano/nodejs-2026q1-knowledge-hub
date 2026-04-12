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

import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginationSortDto } from '../common/dto/pagination-sort.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { getPaginatedResponseSchema } from '../common/swagger/paginated-response.schema';

function hasQueryParams(query: PaginationSortDto): boolean {
  return (
    query.page !== undefined ||
    query.limit !== undefined ||
    query.sortBy !== undefined ||
    query.order !== undefined
  );
}

@Controller('category')
@ApiTags('Categories')
@ApiExtraModels(CategoryResponseDto)
export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all categories',
    description:
      'Returns a plain array when pagination query params are absent, otherwise a paginated response object.',
  })
  @ApiOkResponse({
    description: 'Categories list or paginated categories list',
    schema: {
      oneOf: [
        {
          type: 'array',
          items: { $ref: getSchemaPath(CategoryResponseDto) },
        },
        getPaginatedResponseSchema(CategoryResponseDto),
      ],
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid pagination or sorting query' })
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
  @ApiOperation({ summary: 'Get category by id' })
  @ApiParam({
    name: 'id',
    description: 'Category identifier',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Category found',
    type: CategoryResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid category id format' })
  @ApiNotFoundResponse({ description: 'Category was not found' })
  findById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create category' })
  @ApiCreatedResponse({
    description: 'Category created successfully',
    type: CategoryResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  create(@Body() dto: CreateCategoryDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update category' })
  @ApiParam({
    name: 'id',
    description: 'Category identifier',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Category updated successfully',
    type: CategoryResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid category id or request body',
  })
  @ApiNotFoundResponse({ description: 'Category was not found' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete category' })
  @ApiParam({
    name: 'id',
    description: 'Category identifier',
    format: 'uuid',
  })
  @ApiNoContentResponse({ description: 'Category deleted successfully' })
  @ApiBadRequestResponse({ description: 'Invalid category id format' })
  @ApiNotFoundResponse({ description: 'Category was not found' })
  delete(@Param('id', new ParseUUIDPipe()) id: string) {
    this.service.delete(id);
  }
}
