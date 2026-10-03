import { createServer, type ServerResponse } from "node:http";
import { z } from "zod";
import { InfraiError } from "./infrai.ts";
import { assessPayment, offboardTenant, provisionTenant } from "./tenant_account_workflow.ts";

const provisionBody = z.object({
  tenantId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
});
const paymentBody = z.object({
  eventId: z.string().min(1),
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  amount: z.number().positive(),
  riskScore: z.number().min(0).max(100),
  ip: z.string().ip().optional(),
  deviceFingerprint: z.string().min(1).optional(),
});
const offboardBody = z.object({
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  keyId: z.string().min(1),
});

async function readJson(request: NodeJS.ReadableStream): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(value));
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/tenants") {
      const input = provisionBody.parse(await readJson(request)) as Parameters<typeof provisionTenant>[0];
      const result = await provisionTenant(input);
      send(response, 201, result);
      return;
    }
    if (request.method === "POST" && request.url === "/payments/assess") {
      const event = paymentBody.parse(await readJson(request)) as Parameters<typeof assessPayment>[0];
      send(response, 200, await assessPayment(event));
      return;
    }
    if (request.method === "POST" && request.url === "/tenants/offboard") {
      const account = offboardBody.parse(await readJson(request)) as Parameters<typeof offboardTenant>[0];
      await offboardTenant(account);
      send(response, 200, { tenantId: account.tenantId, status: "offboarded" });
      return;
    }
    send(response, 404, { error: "route_not_found" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      send(response, 400, { error: "invalid_request", issues: error.issues });
    } else if (error instanceof InfraiError) {
      send(response, error.status >= 400 && error.status < 500 ? error.status : 502, {
        error: error.code,
        message: error.message,
      });
    } else {
      send(response, 502, { error: "operation_incomplete" });
    }
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Tenant payment service listening on http://localhost:${port}`));
