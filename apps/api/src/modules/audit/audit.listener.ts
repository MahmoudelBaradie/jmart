/**
 * Bridge of business events into the audit log.
 *
 * Previously `AuditService.logAction()` existed but no code ever called it,
 * so the Admin → Audit Logs page was permanently empty. We now subscribe to
 * the common lifecycle events that the rest of the API already emits and
 * persist a row per event. Failures are swallowed so audit logging can never
 * break a write path.
 */
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditService } from './audit.service';

@Injectable()
export class AuditListener {
  private readonly log = new Logger(AuditListener.name);
  constructor(private readonly audit: AuditService) {}

  @OnEvent('auth.login')
  async onLogin(p: { userId: string; userType?: string; ipAddress?: string }) {
    await this.safe('LOGIN' as any, 'User', p.userId, p);
  }

  @OnEvent('auth.register')
  async onRegister(p: { userId: string; userType?: string }) {
    await this.safe('CREATE' as any, 'User', p.userId, p);
  }

  @OnEvent('order.status.changed')
  async onOrderStatus(p: { orderId: string; fromStatus: string; toStatus: string; changedById?: string }) {
    await this.safe('UPDATE' as any, 'Order', p.orderId, p, p.changedById);
  }

  @OnEvent('shipment.bid.accepted')
  async onBidAccepted(p: { shipmentId: string; winningDriverId: string; logisticsFee: number }) {
    await this.safe('UPDATE' as any, 'Shipment', p.shipmentId, p);
  }

  @OnEvent('shipment.bid.created')
  async onBidCreated(p: { shipmentId: string; bidId: string }) {
    await this.safe('CREATE' as any, 'ShipmentBid', p.bidId, p);
  }

  private async safe(actionType: any, entityType: string, entityId: string, newValue: any, actorId?: string) {
    try {
      await this.audit.logAction({
        actorId, actorType: actorId ? 'USER' : 'SYSTEM',
        actionType, entityType, entityId, newValue,
      });
    } catch (e: any) {
      this.log.warn(`audit write failed (${entityType}): ${e?.message}`);
    }
  }
}
