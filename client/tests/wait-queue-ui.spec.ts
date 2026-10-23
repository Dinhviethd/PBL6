import { test } from "@playwright/test";
import { waitQueueScenario } from "../test-support/wait-queue-ui";
for (const width of [1280, 390]) {
  test(`wait queue web join, leave, offer and error recovery at ${width}px`, async ({
    page,
  }) => {
    await waitQueueScenario(page, false, width);
  });
}
