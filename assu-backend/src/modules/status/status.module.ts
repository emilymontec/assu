import { Module } from '@nestjs/common';
import { StatusController } from './status.controller';
import { StatusService } from './status.service';
import { BankModule } from '../bank/bank.module';
import { BankAccountModule } from '../bank-account/bank-account.module';
import { SyncLogModule } from '../sync-log/sync-log.module';

@Module({
  imports: [BankModule, BankAccountModule, SyncLogModule],
  controllers: [StatusController],
  providers: [StatusService],
})
export class StatusModule {}
