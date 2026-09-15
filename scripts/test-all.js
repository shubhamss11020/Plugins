#!/usr/bin/env node

/**
 * Test All MCP Connectors Locally
 * Reads config.json and tests each server's connection and auth.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const configFile = path.join(__dirname, "..", "config.json");
if (!fs.existsSync(configFile)) {
  console.error("❌ config.json not found!");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configFile, "utf-8"));
const servers = config.servers || {};
const serverKeys = Object.keys(servers);

console.log("=================================================");
console.log("       Testing All MCP Connectors Locally        ");
console.log("=================================================\n");

let passedCount = 0;
let failedCount = 0;
let skippedCount = 0;

for (const key of serverKeys) {
  const s = servers[key];
  console.log(`[TESTING] ${s.name || key} (${key})...`);

  if (!s.url || s.url.trim() === "") {
    console.log(`  ⚪ SKIPPED: URL is empty in config.json\n`);
    skippedCount++;
    continue;
  }

  const result = spawnSync("node", ["scripts/bridge.js", "--name", key, "--check"], {
    cwd: path.join(__dirname, ".."),
    encoding: "utf-8"
  });

  const output = (result.stderr || "") + (result.stdout || "");
  const lines = output.trim().split("\n");

  // Print diagnostic bridge output
  lines.forEach(line => console.log(`  ${line}`));

  if (result.status === 0) {
    console.log(`  👉 RESULT: ✅ PASS (Connected successfully)\n`);
    passedCount++;
  } else {
    console.log(`  👉 RESULT: ❌ FAIL\n`);
    failedCount++;
  }
}

console.log("=================================================");
console.log(`Summary: ${passedCount} Passed | ${failedCount} Failed | ${skippedCount} Skipped`);
console.log("=================================================");
