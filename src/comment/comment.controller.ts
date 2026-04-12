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
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { FindCommentsQueryDto } from './dto/find-comments-query.dto';
import { CommentResponseDto } from './dto/comment-response.dto';

@Controller('comment')
@ApiTags('Comments')
@ApiExtraModels(CommentResponseDto)
export class CommentController {
  constructor(private readonly service: CommentService) {}

  @Get()
  @ApiOperation({ summary: 'Get comments by article id' })
  @ApiOkResponse({
    description: 'Comments related to the specified article',
    type: CommentResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: 'Invalid or missing articleId query' })
  findByArticle(@Query() query: FindCommentsQueryDto) {
    return this.service.findByArticle(query.articleId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get comment by id' })
  @ApiParam({
    name: 'id',
    description: 'Comment identifier',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Comment found',
    type: CommentResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid comment id format' })
  @ApiNotFoundResponse({ description: 'Comment was not found' })
  findById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create comment' })
  @ApiCreatedResponse({
    description: 'Comment created successfully',
    type: CommentResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiUnprocessableEntityResponse({
    description: 'Referenced article does not exist',
  })
  create(@Body() dto: CreateCommentDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete comment' })
  @ApiParam({
    name: 'id',
    description: 'Comment identifier',
    format: 'uuid',
  })
  @ApiNoContentResponse({ description: 'Comment deleted successfully' })
  @ApiBadRequestResponse({ description: 'Invalid comment id format' })
  @ApiNotFoundResponse({ description: 'Comment was not found' })
  delete(@Param('id', new ParseUUIDPipe()) id: string) {
    this.service.delete(id);
  }
}
