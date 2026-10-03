import { randomUUID } from "node:crypto";
import { infrai } from "./infrai.ts";

export type TenantAccount = {
  tenantId: string;
  userId: string;
  keyId: string;
};

export type ProvisionedTenant = {
  account: TenantAccount;
  key: string;
};

export type PaymentEvent = {
  eventId: string;
  tenantId: string;
  userId: string;
  amount: number;
  riskScore: number;
  ip?: string;
  deviceFingerprint?: string;
};

export type PaymentDecision = "approve" | "review";

export type AuditNotification = {
  notificationId: string;
  eventId: string;
  tenantId: string;
  subjectId: string;
  riskScore: number;
  action: PaymentDecision;
};

export function decidePaymentAction(riskScore: number): PaymentDecision {
  return riskScore >= 70 ? "review" : "approve";
}

export async function provisionTenant(input: {
  tenantId: string;
  email: string;
  name: string;
}): Promise<ProvisionedTenant> {
  const user = await infrai.auth.user.create({
    email: input.email,
    name: input.name,
    metadata: { tenant_id: input.tenantId },
    idempotency_key: `tenant-user:${input.tenantId}`,
  });
  const createdKey = await infrai.account.keys.create({
    project_id: input.tenantId,
    name: `${input.name} payment key for ${user.user_id}`,
    scopes: ["payments:write"],
    idempotency_key: `tenant-key:${input.tenantId}`,
  });

  return {
    account: { tenantId: input.tenantId, userId: user.user_id, keyId: createdKey.key_id },
    key: createdKey.key_secret,
  };
}

export async function assessPayment(event: PaymentEvent): Promise<AuditNotification> {
  return {
    notificationId: randomUUID(),
    eventId: event.eventId,
    tenantId: event.tenantId,
    subjectId: event.userId,
    riskScore: event.riskScore,
    action: decidePaymentAction(event.riskScore),
  };
}

export async function offboardTenant(account: TenantAccount): Promise<void> {
  const results = await Promise.allSettled([
    infrai.auth.user.delete(account.userId),
    infrai.account.keys.revoke(account.keyId),
  ]);
  const failures = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
  if (failures.length > 0) {
    throw new AggregateError(failures.map((failure) => failure.reason), `Offboarding ${account.tenantId} did not complete`);
  }
}
