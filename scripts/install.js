#!/usr/bin/env node

/**
 * Interactive 1-Click Installer for Claude Desktop
 * Run directly or via setup.bat
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

const appData = process.env.APPDATA || (process.platform === "darwin" 
  ? path.join(os.homedir(), "Library", "Application Support") 
  : path.join(os.homedir(), ".config"));

const claudeDir = path.join(appData, "Claude");
const configPath = path.join(claudeDir, "claude_desktop_config.json");
const backupPath = path.join(claudeDir, `claude_desktop_config.backup.${Date.now()}.json`);

const configDir = path.join(os.homedir(), ".eoxs");
const tokenFile = path.join(configDir, "token.json");
const bridgeScriptPath = path.resolve(__dirname, "bridge.js").replace(/\\/g, "/");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function run() {
  console.log("=================================================");
  console.log("    EOXS Plugin 1-Click Setup for Claude Desktop");
  console.log("=================================================\n");

  // Check if token already exists
  let existingToken = null;
  if (fs.existsSync(tokenFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(tokenFile, "utf-8"));
      existingToken = parsed.token;
    } catch (e) {}
  }

  if (existingToken) {
    console.log(`[OK] Found existing token in ${tokenFile}`);
    const answer = await prompt("Do you want to enter a new token? (y/N): ");
    if (answer.trim().toLowerCase() === "y") {
      await askAndSaveToken();
    }
  } else {
    await askAndSaveToken();
  }

  // Configure Claude Desktop config
  console.log("\nConfiguring Claude Desktop...");
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  let config = {};
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      config = JSON.parse(raw);
      fs.writeFileSync(backupPath, raw, "utf-8");
      console.log(`[OK] Backed up previous configuration.`);
    } catch (err) {
      config = {};
    }
  }

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  config.mcpServers["eoxs-intern"] = {
    command: "node",
    args: [
      bridgeScriptPath,
      "https://thread-vault-db-testing.onrender.com/zStpO9S-zb3JtCPfb2ieZhN8wYxPRIPNJsAuInnt6mY/sse"
    ]
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

  console.log("\n=================================================");
  console.log(" [SUCCESS] Plugin successfully added to Claude Desktop!");
  console.log("=================================================");
  console.log("\nWhat to do next:");
  console.log("1. Quit Claude Desktop completely from your system tray (near the clock).");
  console.log("2. Open Claude Desktop again.");
  console.log("3. The EOXS tools will now be available under the hammer icon (🛠️)!");
  console.log("\n");

  rl.close();
}

async function askAndSaveToken() {
  const tokenInput = await prompt("Enter your EOXS Auth Token: ");
  const cleanToken = tokenInput.trim();
  if (!cleanToken) {
    console.log("[Notice] No token entered. Skipping token save.");
    return;
  }

  const nameInput = await prompt("Enter your Name (optional): ");
  const name = nameInput.trim() || "User";

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const payload = { name: name, token: cleanToken };
  fs.writeFileSync(tokenFile, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`[OK] Token saved securely to ${tokenFile}`);
}

run().catch(err => {
  console.error("Setup error:", err);
  rl.close();
});
