import { Global, Module } from '@nestjs/common';
import { TenantTransaction } from './tenant/tenant-transaction';

@Global()
@Module({
  providers: [TenantTransaction],
  exports: [TenantTransaction],
})
export class SharedModule {}
