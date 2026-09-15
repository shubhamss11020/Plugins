#!/usr/bin/env node

/**
 * MCP Stdio-to-Remote Bridge for Raj's Suite
 * 
 * Configured for the 5 MCP servers:
 *   1. threads-wiki ➔ https://mcp.askcruz.com/wiki/mcp (with token)
 *   2. threads-ov   ➔ Direct SSE URL ending with /sse (NO AUTH HEADER)
 *   3. ceo          ➔ https://mcp.askcruz.com/ceo/mcp (with token)
 *   4. ask-cruz     ➔ https://mcp.askcruz.com/team/mcp (with token)
 *   5. team-eoxs    ➔ https://mcp.askcruz.com/eoxs-team/mcp (with token)
 * 
 * Reads server definitions, custom headers, and tokens from config.json.
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

// Paths
const CONFIG_FILE = path.join(__dirname, "..", "config.json");
const LOCAL_ENV_FILE = path.join(__dirname, "..", ".env");
const USER_CONFIG_DIR = path.join(os.homedir(), ".eoxs");
const USER_TOKEN_FILE = path.join(USER_CONFIG_DIR, "token.json");

// Auto-load .env
if (fs.existsSync(LOCAL_ENV_FILE)) {
  try {
    const envLines = fs.readFileSync(LOCAL_ENV_FILE, "utf-8").split("\n");
    for (const line of envLines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = (match[2] || "").trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[match[1]] = val;
      }
    }
  } catch (e) {}
}

// Load config.json
let localConfig = { servers: {} };
if (fs.existsSync(CONFIG_FILE)) {
  try {
    localConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
  } catch (e) {
    console.error("[Bridge Error] Failed to parse config.json:", e.message);
  }
}

// Parse CLI Arguments
const args = process.argv.slice(2);
let serverName = "ask-cruz";
let cliUrl = args.find(a => a.startsWith("http"));
let cliHeaderName = null;
let cliToken = null;

for (let i = 0; i < args.length; i++) {
  if ((args[i] === "--name" || args[i] === "--server") && args[i + 1]) {
    serverName = args[i + 1];
  }
  if (args[i] === "--header" && args[i + 1]) {
    cliHeaderName = args[i + 1];
  }
  if (args[i] === "--token" && args[i + 1]) {
    cliToken = args[i + 1];
  }
  if (args[i] === "--url" && args[i + 1]) {
    cliUrl = args[i + 1];
  }
}

const isCheckMode = args.includes("--check") || args.includes("--test");

// Lookup server in config.json
const serverDef = (localConfig.servers && localConfig.servers[serverName]) || {};

const remoteUrl = cliUrl || serverDef.url || "https://mcp.askcruz.com/team/mcp";
const headerName = cliHeaderName || serverDef.headerName || localConfig.defaultHeaderName || "x-auth-token";
const isNoAuth = serverDef.noAuth === true || serverName === "threads-ov" || serverName === "team-eoxs" || serverName === "ask-cruz" || args.includes("--no-auth");

function log(...args) {
  console.error(`[Bridge:${serverName}]`, ...args);
}

// Resolve Token
function getToken() {
  if (isNoAuth) {
    log("Auth: Direct connection (no token / no auth header).");
    return null;
  }

  // 1. Direct CLI argument
  if (cliToken) {
    log("Auth: Using token provided via CLI argument.");
    return cliToken.trim();
  }

  // 2. Server-specific token in config.json
  if (serverDef.token && serverDef.token !== "YOUR_TOKEN_HERE") {
    log("Auth: Using token configured for server in config.json.");
    return serverDef.token.trim();
  }

  // 3. Default fallback token in config.json
  if (localConfig.defaultToken && localConfig.defaultToken !== "YOUR_TOKEN_HERE") {
    log("Auth: Using defaultToken from config.json.");
    return localConfig.defaultToken.trim();
  }

  // 4. Server-specific environment variable
  const envKey = serverName.toUpperCase().replace(/[^A-Z0-9]/g, "_") + "_TOKEN";
  if (process.env[envKey]) {
    log(`Auth: Using environment variable (${envKey}).`);
    return process.env[envKey].trim();
  }

  // 5. Global environment variable
  if (process.env.ASKCRUZ_API_TOKEN || process.env.EOXS_API_TOKEN) {
    const token = (process.env.ASKCRUZ_API_TOKEN || process.env.EOXS_API_TOKEN).trim();
    log("Auth: Using global environment variable token.");
    return token;
  }

  // 6. ~/.eoxs/token.json (only for servers that require auth)
  if (fs.existsSync(USER_TOKEN_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(USER_TOKEN_FILE, "utf-8"));
      if (data.tokens && data.tokens[serverName]) {
        log(`Auth: Using token for "${serverName}" from ${USER_TOKEN_FILE}`);
        return data.tokens[serverName].trim();
      }
      if (data[serverName]) {
        log(`Auth: Using token for "${serverName}" from ${USER_TOKEN_FILE}`);
        return data[serverName].trim();
      }
      if (data.token) {
        log(`Auth: Using primary token from ${USER_TOKEN_FILE}`);
        return data.token.trim();
      }
    } catch (e) {}
  }

  log("Auth: No token found. Please set your token in config.json, .env, or ~/.eoxs/token.json");
  return null;
}

function startBridge(token) {
  log(`Target Endpoint: ${remoteUrl}`);
  if (isNoAuth) {
    log(`Auth: Direct URL connection (no token / no auth header)`);
  } else {
    log(`Configured Header: "${headerName}"`);
    if (token) {
      log(`Token: ${token.slice(0, 6)}... (loaded)`);
    } else {
      log("Token: (none provided)");
    }
  }

  const targetUrl = new URL(remoteUrl);
  const isHttps = targetUrl.protocol === "https:";
  const clientLib = isHttps ? https : http;

  const authHeaders = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream"
  };
  if (token && !isNoAuth) {
    authHeaders[headerName] = token;
  }

  let postEndpointUrl = null;
  const pendingQueue = [];

  const reqHeaders = {
    "Accept": "text/event-stream, application/json"
  };
  if (token && !isNoAuth) {
    reqHeaders[headerName] = token;
  }

  // Initiate connection
  const sseReq = clientLib.request(targetUrl, {
    method: "GET",
    headers: reqHeaders
  }, (res) => {
    if (res.statusCode === 401) {
      log(`❌ 401 Unauthorized: Server rejected token on header "${headerName}".`);
      process.exit(1);
    }

    if (isCheckMode) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        log(`✅ Verification successful! Server responded with HTTP ${res.statusCode}.`);
        process.exit(0);
      } else {
        log(`❌ Server returned HTTP ${res.statusCode}. Please verify endpoint URL or token.`);
        process.exit(1);
      }
    }

    let buffer = "";
    let currentEvent = null;

    res.on("data", (chunk) => {
      buffer += chunk.toString("utf-8");
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith("event:")) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          const data = line.slice(5).trim();
          if (currentEvent === "endpoint" && !postEndpointUrl) {
            postEndpointUrl = new URL(data, remoteUrl).toString();
            log(`Endpoint ready: ${postEndpointUrl}`);

            while (pendingQueue.length > 0) {
              const queued = pendingQueue.shift();
              dispatchPost(queued);
            }
          } else if (data) {
            // Write only valid JSON-RPC to stdout for Claude Desktop
            if (data.startsWith("{") || data.startsWith("[")) {
              process.stdout.write(data + "\n");
            }
          }
        }
      }
    });

    res.on("end", () => {
      log("Connection closed by server.");
      process.exit(0);
    });
  });

  sseReq.on("error", (err) => {
    if (isCheckMode) {
      log(`❌ Connection test failed: ${err.message}`);
      process.exit(1);
    }
    log(`Connection notice: ${err.message}. Ready for direct POST.`);
    postEndpointUrl = remoteUrl;
  });

  sseReq.end();

  if (isCheckMode) return;

  function dispatchPost(jsonRpcString) {
    const destUrl = new URL(postEndpointUrl || remoteUrl);
    const postLib = destUrl.protocol === "https:" ? https : http;

    const postReq = postLib.request(destUrl, {
      method: "POST",
      headers: authHeaders
    }, (postRes) => {
      let responseBody = "";
      postRes.on("data", chunk => responseBody += chunk.toString("utf-8"));
      postRes.on("end", () => {
        const body = responseBody.trim();
        // Ignore non-JSON response strings like "Accepted"
        if (body.startsWith("{") || body.startsWith("[")) {
          process.stdout.write(body + "\n");
        }
      });
    });

    postReq.on("error", (err) => {
      log("Error sending request to server:", err.message);
    });

    postReq.write(jsonRpcString);
    postReq.end();
  }

  // Claude Desktop stdio interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (!postEndpointUrl) {
      pendingQueue.push(trimmed);
    } else {
      dispatchPost(trimmed);
    }
  });

  log("Bridge active. Listening for Claude Desktop requests.");
}

const token = getToken();
startBridge(token);
