import { Module } from '@nestjs/common';
import { StorageModule } from './storage/storage.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [StorageModule, UserModule],
})
export class AppModule {}
