import { test } from "@playwright/test";
import { waitQueueScenario } from "../test-support/wait-queue-ui";
test("wait queue Expo web join, leave, offer and error recovery", async ({
  page,
}) => {
  await waitQueueScenario(page, true, 390);
});
