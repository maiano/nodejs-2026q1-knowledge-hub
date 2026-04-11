import { Module } from '@nestjs/common';
import { StorageModule } from './storage/storage.module';
import { UserModule } from 'src/user/user.module';
import { ArticleModule } from 'src/article/article.module';
import { CommentModule } from 'src/comment/comment.module';
import { CategoryModule } from 'src/category/category.module';
import { AppController } from 'src/app.controller';

@Module({
  imports: [
    StorageModule,
    UserModule,
    ArticleModule,
    CommentModule,
    CategoryModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
