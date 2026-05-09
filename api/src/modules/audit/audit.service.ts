import type { EntityManager } from 'typeorm';

export type PromotionAuditPayload = {
  promotedUserId: string;
  performedByUserId: string;
  newRole: string;
};

/**
 * Audit trail stub — call sites pass an optional transactional `EntityManager` for future inserts.
 */
export class AuditService {
  constructor(private readonly _manager?: EntityManager) {}

  async logPromotion(payload: PromotionAuditPayload): Promise<void> {
    void this._manager;
    if (process.env.NODE_ENV !== `production`) {
      console.log(`[AuditService] logPromotion`, payload);
    }
  }
}
