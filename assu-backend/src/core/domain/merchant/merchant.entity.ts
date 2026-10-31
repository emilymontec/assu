import { DocumentType } from './document-type.enum';
import { MerchantStatus } from './merchant-status.enum';

export class Merchant {
  constructor(
    public readonly id: string,
    public readonly documentType: DocumentType,
    public readonly documentNumber: string,
    public fullName: string,
    public readonly email: string,
    public phone: string,
    public passwordHash: string,
    public documentPhotoStorageRef: string,
    public status: MerchantStatus,
    public emailVerifiedAt: Date | null,
    public readonly createdAt: Date,
    public updatedAt: Date = new Date(),
  ) {}

  canLogIn(): boolean {
    return this.status !== MerchantStatus.SUSPENDED;
  }

  markEmailVerified(): void {
    this.emailVerifiedAt = new Date();
    if (this.status === MerchantStatus.PENDING_VERIFICATION) {
      this.status = MerchantStatus.ACTIVE;
    }
    this.updatedAt = new Date();
  }
}
