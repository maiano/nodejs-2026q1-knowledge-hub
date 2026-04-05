import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';

import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('comment')
export class CommentController {
  constructor(private readonly service: CommentService) {}

  @Get()
  findByArticle(@Query('articleId') articleId?: string) {
    if (!articleId) {
      throw new BadRequestException();
    }

    return this.service.findByArticle(articleId);
  }

  @Get(':id')
  findById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateCommentDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', new ParseUUIDPipe()) id: string) {
    this.service.delete(id);
  }
}
