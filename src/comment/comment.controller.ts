import {
  Body,
  Controller,
  Delete,
  Get,
  Req,
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
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: JwtPayload;
}

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
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create comment' })
  @ApiCreatedResponse({
    description: 'Comment created successfully',
    type: CommentResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiUnprocessableEntityResponse({
    description: 'Referenced article does not exist',
  })
  create(@Body() dto: CreateCommentDto, @Req() req: RequestWithUser) {
    return this.service.create(dto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
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
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: RequestWithUser,
  ) {
    await this.service.delete(id, req.user);
  }
}
