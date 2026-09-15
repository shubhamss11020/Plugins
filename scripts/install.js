#!/usr/bin/env node

/**
 * 1-Click Installer for Claude Desktop
 * Profile: Raj
 * Configures the 5 MCP Servers:
 * 1. threads-wiki ➔ https://mcp.askcruz.com/wiki/mcp (with token)
 * 2. threads-ov   ➔ Direct SSE URL ending with /sse (NO AUTH HEADER)
 * 3. ceo          ➔ https://mcp.askcruz.com/ceo/mcp (with token)
 * 4. ask-cruz     ➔ https://mcp.askcruz.com/team/mcp (with token)
 * 5. team-eoxs    ➔ https://mcp.askcruz.com/eoxs-team/mcp (with token)
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
const localConfigFile = path.join(__dirname, "..", "config.json");
const bridgeScriptPath = path.resolve(__dirname, "bridge.js").replace(/\\/g, "/");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

const SERVERS = [
  { id: "threads-wiki", name: "Threads-wiki", url: "https://mcp.askcruz.com/wiki/mcp", auth: true },
  { id: "threads-ov", name: "Threads-OV", url: "https://thread-vault-db-testing.onrender.com/zStpO9S-zb3JtCPfb2ieZhN8wYxPRIPNJsAuInnt6mY/sse", auth: false },
  { id: "ceo", name: "CEO", url: "https://mcp.askcruz.com/raj/mcp", auth: true },
  { id: "ask-cruz", name: "Ask Cruz", url: "https://mcp.askcruz.com/team/mcp", auth: true },
  { id: "team-eoxs", name: "Team EOXS", url: "https://mcpeoxsteamlive.lancerdevops.me/mcp", auth: false }
];

async function run() {
  console.log("=================================================");
  console.log("    Raj's Multi-MCP Setup for Claude Desktop");
  console.log("=================================================\n");

  const askToken = await prompt("Do you want to enter/update your auth token for the authenticated servers? (y/N): ");
  if (askToken.trim().toLowerCase() === "y") {
    const token = await prompt("Enter your auth token: ");
    if (token.trim()) {
      let cfg = { servers: {} };
      if (fs.existsSync(localConfigFile)) {
        try { cfg = JSON.parse(fs.readFileSync(localConfigFile, "utf-8")); } catch(e) {}
      }
      cfg.defaultHeaderName = "x-auth-token";
      cfg.defaultToken = token.trim();
      if (!cfg.servers) cfg.servers = {};

      SERVERS.forEach(s => {
        cfg.servers[s.id] = {
          name: s.name,
          url: (cfg.servers[s.id] && cfg.servers[s.id].url) || s.url,
          headerName: s.auth ? "x-auth-token" : undefined,
          token: s.auth ? token.trim() : undefined,
          noAuth: s.auth ? undefined : true
        };
      });

      fs.writeFileSync(localConfigFile, JSON.stringify(cfg, null, 2), "utf-8");
      console.log(`[OK] Saved token in config.json`);

      if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(tokenFile, JSON.stringify({ name: "Raj", token: token.trim() }, null, 2), "utf-8");
      console.log(`[OK] Saved profile in ~/.eoxs/token.json\n`);
    }
  }

  // Update Claude Desktop config
  console.log("Configuring Claude Desktop...");
  if (!fs.existsSync(claudeDir)) fs.mkdirSync(claudeDir, { recursive: true });

  let config = {};
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      config = JSON.parse(raw);
      fs.writeFileSync(backupPath, raw, "utf-8");
      console.log(`[OK] Backup created at: ${backupPath}`);
    } catch (err) {
      config = {};
    }
  }

  if (!config.mcpServers) config.mcpServers = {};

  // Clean out legacy servers
  delete config.mcpServers["hr"];
  delete config.mcpServers["internal-team"];
  delete config.mcpServers["eoxs-intern"];

  // Register all 5 servers
  SERVERS.forEach(s => {
    config.mcpServers[s.id] = {
      command: "node",
      args: [
        bridgeScriptPath,
        "--name",
        s.id
      ]
    };
  });

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

  console.log("\n=================================================");
  console.log(" [SUCCESS] All 5 MCP Servers configured for Raj!");
  console.log("=================================================");
  SERVERS.forEach((s, idx) => {
    const authType = s.auth ? "with token" : "direct SSE, no auth";
    console.log(`  ${idx + 1}. ${s.name} (${s.id}) ➔ ${s.url} [${authType}]`);
  });
  console.log("\nNext Steps:");
  console.log("1. Restart Claude Desktop.");
  console.log("2. Check the hammer (🛠️) icon to see tools from all 5 servers active!");

  rl.close();
}

run().catch(err => {
  console.error("Setup error:", err);
  rl.close();
});
