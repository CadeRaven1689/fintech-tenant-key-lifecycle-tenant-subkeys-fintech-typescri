import assert from "node:assert/strict";
import test from "node:test";
import { decidePaymentAction } from "../src/tenant_account_workflow.ts";

test("a high-risk payment is held for review", () => {
  assert.equal(decidePaymentAction(69), "approve");
  assert.equal(decidePaymentAction(70), "review");
  assert.equal(decidePaymentAction(96), "review");
});
