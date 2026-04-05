import { Module } from '@nestjs/common';
import { StorageModule } from './storage/storage.module';
import { UserModule } from 'src/user/user.module';
import { ArticleModule } from 'src/article/article.module';
import { CommentModule } from 'src/comment/comment.module';

@Module({
  imports: [StorageModule, UserModule, ArticleModule, CommentModule],
})
export class AppModule {}
