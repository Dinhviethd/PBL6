import { test } from "@playwright/test";
import { queuePurchase } from "../test-support/wait-queue-e2e";
test("Expo wait queue real API: released stock becomes an offer and one paid ticket", async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.WAIT_QUEUE_FIXTURE,
    "Run scripts/test-wait-queue.cjs with an isolated test database",
  );
  await queuePurchase(page, context, true);
});
