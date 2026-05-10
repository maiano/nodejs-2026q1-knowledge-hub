import { Module } from '@nestjs/common';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { EmbeddingService } from './embedding.service';
import { ChunkerService } from './chunker.service';
import { QdrantService } from './qdrant.service';
import { RagConversationService } from './rag-conversation.service';
import { ReindexTrackerService } from './reindex-tracker.service';
import { LoggerModule } from '../../logger/logger.module';
import { AiModule } from '../ai.module';

@Module({
  imports: [LoggerModule, AiModule],
  controllers: [RagController],
  providers: [
    RagService,
    EmbeddingService,
    ChunkerService,
    QdrantService,
    RagConversationService,
    ReindexTrackerService,
  ],
})
export class RagModule {}
