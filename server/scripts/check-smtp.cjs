const path = require("node:path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  quiet: true,
});
const nodemailer = require("nodemailer");

async function main() {
  const options = require("../dist/platform/smtp").smtpOptions();
  if (process.argv.includes("--config-only")) {
    console.log(
      "SMTP configuration is complete. No connection or email was sent.",
    );
    return;
  }
  const transport = nodemailer.createTransport(options);
  try {
    await transport.verify();
    console.log(
      "SMTP connection and authentication succeeded. No email was sent; sender acceptance and inbox delivery still need a sending test.",
    );
  } catch (error) {
    const codes = [
      "EAUTH",
      "ECONNECTION",
      "ETIMEDOUT",
      "EDNS",
      "ESOCKET",
      "ETLS",
    ];
    throw Error(
      `SMTP verification failed (${codes.includes(error.code) ? error.code : "SMTP_ERROR"}). Check the provider settings and network access.`,
    );
  } finally {
    transport.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
