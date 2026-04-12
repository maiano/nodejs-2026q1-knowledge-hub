import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';

import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { PaginationSortDto } from '../common/dto/pagination-sort.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { getPaginatedResponseSchema } from '../common/swagger/paginated-response.schema';

function hasQueryParams(query: PaginationSortDto): boolean {
  return (
    query.page !== undefined ||
    query.limit !== undefined ||
    query.sortBy !== undefined ||
    query.order !== undefined
  );
}

@Controller('user')
@ApiTags('Users')
@ApiExtraModels(UserResponseDto)
export class UserController {
  constructor(private readonly service: UserService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all users',
    description:
      'Returns a plain array when pagination query params are absent, otherwise a paginated response object.',
  })
  @ApiOkResponse({
    description: 'Users list or paginated users list',
    schema: {
      oneOf: [
        {
          type: 'array',
          items: { $ref: getSchemaPath(UserResponseDto) },
        },
        getPaginatedResponseSchema(UserResponseDto),
      ],
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid pagination or sorting query' })
  findAll(@Query() query: PaginationSortDto) {
    if (!hasQueryParams(query)) {
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
  @ApiOperation({ summary: 'Get user by id' })
  @ApiParam({
    name: 'id',
    description: 'User identifier',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'User found',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid user id format' })
  @ApiNotFoundResponse({ description: 'User was not found' })
  findById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create user' })
  @ApiCreatedResponse({
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user password' })
  @ApiParam({
    name: 'id',
    description: 'User identifier',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'User password updated successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid user id or request body' })
  @ApiForbiddenResponse({ description: 'Old password does not match' })
  @ApiNotFoundResponse({ description: 'User was not found' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.service.updatePassword(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user' })
  @ApiParam({
    name: 'id',
    description: 'User identifier',
    format: 'uuid',
  })
  @ApiNoContentResponse({ description: 'User deleted successfully' })
  @ApiBadRequestResponse({ description: 'Invalid user id format' })
  @ApiNotFoundResponse({ description: 'User was not found' })
  delete(@Param('id', new ParseUUIDPipe()) id: string) {
    this.service.delete(id);
  }
}
