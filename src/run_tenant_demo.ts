import { assessPayment, offboardTenant, provisionTenant } from "./tenant_account_workflow.ts";

const tenantId = `studio-${Date.now()}`;
const provisioned = await provisionTenant({
  tenantId,
  email: "chenhua@changba.com",
  name: "Northlight Studio",
});

try {
  // Deliver this secret now: later account records retain only keyId because plaintext is returned once.
  console.log("Tenant credential handoff", {
    tenantId,
    userId: provisioned.account.userId,
    keyId: provisioned.account.keyId,
    key: provisioned.key,
  });

  const notification = await assessPayment({
    eventId: `invoice-${Date.now()}`,
    tenantId,
    userId: provisioned.account.userId,
    amount: 240,
    riskScore: 82,
    deviceFingerprint: "editing-suite-07",
  });
  console.log("Audit notification", notification);
} finally {
  await offboardTenant(provisioned.account);
}
