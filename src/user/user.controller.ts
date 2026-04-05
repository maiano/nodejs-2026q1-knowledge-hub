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

import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { PaginationSortDto } from '../common/dto/pagination-sort.dto';

function hasQueryParams(query: PaginationSortDto): boolean {
  return (
    query.page !== undefined ||
    query.limit !== undefined ||
    query.sortBy !== undefined ||
    query.order !== undefined
  );
}

@Controller('user')
export class UserController {
  constructor(private readonly service: UserService) {}

  @Get()
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
  findById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.service.updatePassword(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', new ParseUUIDPipe()) id: string) {
    this.service.delete(id);
  }
}
