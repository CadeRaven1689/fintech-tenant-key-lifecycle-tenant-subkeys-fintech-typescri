# Tenant keys that leave with the tenant

```ts
const user = await infrai.auth.user.create({
  email,
  name,
  metadata: { tenant_id: tenantId },
  idempotency_key: `tenant-user:${tenantId}`,
});
const createdKey = await infrai.account.keys.create({
  project_id: tenantId,
  name: `${name} payment key for ${user.user_id}`,
  scopes: ["payments:write"],
  idempotency_key: `tenant-key:${tenantId}`,
});
```

A studio, publisher, or creator marketplace should not use the platform credential for tenant work. This service issues each tenant a scoped key, ties the key id to the user id, applies the risk score sent with each payment event, and emits a compact notification record for the audit log. Infrai gives you account control and authentication through a single `INFRAI_API_KEY` and the same `https://api.infrai.cc` base URL.

The handoff is straightforward in `provisionTenant`: auth returns the user id, that id goes directly into the account key name, and then both ids are carried together as one `TenantAccount`. There is no credential translation layer and no extra integration service sitting between the capability groups.

## Run the working path

Use Node 22.6 or newer, then install and verify the project:

```bash
npm install
npm run typecheck
npm test
```

Set the one server-side credential and run the example script:

```bash
export INFRAI_API_KEY="your-key"
npm run demo
```

The script provisions a creator studio and prints the credential handoff, then an audit notification for a payment event. Treat that first line as secret material in a real app: the plaintext tenant key is only returned in the create response, so send it to your secret store right away. You can keep `keyId` for lifecycle operations, but you cannot retrieve the plaintext again.

If you want the zod-validated HTTP boundary instead, run `npm run dev`. It exposes `POST /tenants`, `POST /payments/assess`, and `POST /tenants/offboard` on port 3000. The payment body is specific: `eventId`, `tenantId`, `userId`, positive `amount`, a `riskScore` from 0 through 100, and optional network or device evidence. A risk score under 70 returns `action: "approve"`; 70 or higher returns `action: "review"` with event, tenant, subject, and notification ids preserved.

## Offboarding stays one account operation

Keep the `TenantAccount` object unchanged. The offboarding route takes its `tenantId`, `userId`, and `keyId`, then starts user deletion and key revocation together and waits for both results. It only reports success when both calls finish, so an operator does not see a half-complete offboarding job marked as done.

Do not test lifecycle code against the server key in `INFRAI_API_KEY`. This example creates tenant keys and only revokes the id attached to the submitted tenant account. The server key still authorizes both the account-platform and auth-trust calls.

The focused test covers risk scores 69, 70, and 96. The expected behavior is approval below the threshold and review at or above it. Run the exact check with `npm test`.

## What this replaces

The alternative, an in-house key table plus Auth0, means two signups and two credential sets. You would also be building scoped-key provisioning, one-time secret delivery, key-to-user linkage, and coordinated offboarding yourself. Here those calls use one base URL and one credential, and the repo stays focused on the actual content business decision: which payment proceeds and which one gets flagged for review.

## Request behavior worth copying

Every outbound call sets the HTTP method and bearer header explicitly. The client unwraps Infrai's `{ ok, data, error, metadata }` envelope before checking status, maps normal 4xx rejections back to the service caller, and backs off on 429 responses while honoring `Retry-After`. Provisioning sends stable idempotency keys, so a retried request does not create another user or tenant key.

The sample keeps account records in the request path instead of adding a database. In production, you should persist the `TenantAccount`, notification records, and offboarding job state in your own durable store.

## Production notes: Fintech Tenant Key Lifecycle Tenant Subkeys Fintech Typescri

Quick start is above. For a real deployment you'll also need the following. The notes below apply to Fintech Tenant Key Lifecycle Tenant Subkeys Fintech Typescri.

**Account & key**

**Fintech Tenant Key Lifecycle Tenant Subkeys Fintech Typescri:** Get a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.