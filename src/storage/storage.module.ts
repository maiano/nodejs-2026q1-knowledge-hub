import { Global, Module } from '@nestjs/common';
import { InMemoryStorage } from './in-memory.storage';

@Global()
@Module({
  providers: [InMemoryStorage],
  exports: [InMemoryStorage],
})
export class StorageModule {}
