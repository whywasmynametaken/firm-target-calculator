import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const sourceConfig = new URL("./dist/server/wrangler.json", import.meta.url);
const dataDir = process.env.APP_DATA_DIR || "/data";
const runtimeConfig = `${dataDir}/wrangler-runtime.json`;
const wranglerState = `${dataDir}/wrangler-state`;

await mkdir(dataDir, { recursive: true });

const config = JSON.parse(await readFile(sourceConfig, "utf8"));
config.main = resolve("dist/server/index.js");
if (config.assets?.directory) {
  config.assets.directory = resolve("dist/client");
}
config.vars = {
  ...config.vars,
  AUTH_SECRET: process.env.AUTH_SECRET ?? "",
  COOKIE_SECURE: process.env.COOKIE_SECURE ?? "false",
  OWNER_SETUP_CODE: process.env.OWNER_SETUP_CODE ?? "",
};

await writeFile(runtimeConfig, `${JSON.stringify(config, null, 2)}\n`);

const port = process.env.PORT || "3000";
const child = spawn(
  "./node_modules/.bin/wrangler",
  [
    "dev",
    "dist/server/index.js",
    "--config",
    runtimeConfig,
    "--ip",
    "0.0.0.0",
    "--port",
    port,
    "--local",
    "--persist-to",
    wranglerState,
    "--inspector-port",
    "0",
    "--log-level",
    "warn",
    "--show-interactive-dev-session=false",
  ],
  { stdio: "inherit" },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
