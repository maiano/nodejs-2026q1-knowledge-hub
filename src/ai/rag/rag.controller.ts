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
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RagService } from './rag.service';
import { ReindexDto } from './dto/reindex.dto';
import { RagSearchDto } from './dto/rag-search.dto';
import { RagChatDto } from './dto/rag-chat.dto';
import { AiRateLimitGuard } from '../rate-limit/ai-rate-limit.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('RAG')
@Roles(UserRole.EDITOR, UserRole.ADMIN)
@Controller('ai/rag')
@UseGuards(AiRateLimitGuard)
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('index')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Index Knowledge Hub articles into vector storage' })
  index(@Body() dto: ReindexDto) {
    return this.ragService.index(dto);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Semantic search over indexed articles' })
  search(@Body() dto: RagSearchDto) {
    return this.ragService.search(dto);
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chat with Knowledge Hub using RAG' })
  chat(@Body() dto: RagChatDto) {
    return this.ragService.chat(dto);
  }

  @Delete('index/articles/:articleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove article vectors from index' })
  deleteArticleIndex(
    @Param('articleId', new ParseUUIDPipe()) articleId: string,
  ) {
    return this.ragService.deleteArticleIndex(articleId);
  }

  @Get('chat/:conversationId/history')
  @ApiOperation({ summary: 'Get RAG conversation history' })
  getHistory(@Param('conversationId') conversationId: string) {
    return this.ragService.getConversationHistory(conversationId);
  }
}
