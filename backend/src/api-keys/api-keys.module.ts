import { Module } from '@nestjs/common';
import { ApiKeysController, PublicAuditsController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';

@Module({
  controllers: [ApiKeysController, PublicAuditsController],
  providers:   [ApiKeysService],
})
export class ApiKeysModule {}
