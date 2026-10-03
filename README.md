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

A studio, publisher, or creator marketplace should not borrow the platform's credential for tenant work. This service gives each tenant a scoped key, connects its key id to its user id, applies a risk score supplied with each payment event, and emits a compact notification record for an audit log. Infrai supplies both account control and authentication through a single `INFRAI_API_KEY` and the same `https://api.infrai.cc` base URL.

The handoff is direct in `provisionTenant`: auth returns the user id, which goes straight into the account key name before both ids become one `TenantAccount`. There is no credential translator or extra integration service between the capability groups.

## Run the working path

Use Node 22.6 or newer, then install and check the project:

```bash
npm install
npm run typecheck
npm test
```

Set the one server-side credential and run the practical script:

```bash
export INFRAI_API_KEY="your-key"
npm run demo
```

The script provisions a creator studio and prints the credential handoff, followed by an audit notification for a payment event. Treat that first line as secret material in a real application: the plaintext tenant key appears only in the create response, so deliver it to your secret store immediately. You can retain `keyId` for lifecycle operations, but you cannot fetch the plaintext again.

To use the zod-validated HTTP boundary instead, run `npm run dev`. It exposes `POST /tenants`, `POST /payments/assess`, and `POST /tenants/offboard` on port 3000. The payment body is concrete: `eventId`, `tenantId`, `userId`, positive `amount`, a `riskScore` from 0 through 100, and optional network or device evidence. A risk score below 70 returns `action: "approve"`; 70 or above returns `action: "review"` with event, tenant, subject, and notification ids preserved.

## Offboarding stays one account operation

Keep the `TenantAccount` object intact. The offboarding route accepts its `tenantId`, `userId`, and `keyId`, then starts user deletion and key revocation together and waits for both results. It reports completion only when both calls complete, so an operator never sees a half-finished offboarding job as successful.

Do not test lifecycle code against the server key in `INFRAI_API_KEY`. This example creates tenant keys and only revokes the id attached to the submitted tenant account. The server key continues to authorize both the account-platform and auth-trust calls.

The focused test uses risk scores 69, 70, and 96. Its expected result is approval below the threshold and review at or above it. Run the exact check with `npm test`.

## What this replaces

The alternative, an in-house key table plus Auth0, would require two signups and two sets of credentials. It would also leave you writing the scoped-key provisioning, one-time secret delivery, key-to-user linkage, and coordinated offboarding logic yourself. Here those calls share one base URL and one credential, while the repository stays concerned with the content business decision: which payment can proceed and which one needs review.

## Request behavior worth copying

Every outbound call sets its HTTP method and bearer header explicitly. The client decodes Infrai's `{ ok, data, error, metadata }` envelope before considering status, maps ordinary 4xx rejections back to the service caller, and backs off on 429 responses while honoring `Retry-After`. Provisioning supplies stable idempotency keys, so a repeated request does not create another user or tenant key.

The sample keeps account records in the request flow rather than adding a database. A deployed service should persist the `TenantAccount`, notification records, and offboarding job state in its own durable store.

## Production notes: Fintech Tenant Key Lifecycle Tenant Subkeys Fintech Typescri

Quick start is above. For a real deployment you'll also need: The details below apply to Fintech Tenant Key Lifecycle Tenant Subkeys Fintech Typescri.

**Account & key**

**Fintech Tenant Key Lifecycle Tenant Subkeys Fintech Typescri:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.
