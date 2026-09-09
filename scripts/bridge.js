#!/usr/bin/env node

/**
 * AskCruz / EOXS Live MCP Bridge for Claude Desktop
 *
 * Remote Endpoint: https://mcp.askcruz.com/intern/mcp
 * Auth Header:     x-auth-token: <intern_token>
 *
 * This script bridges Claude Desktop stdio (JSON-RPC) to the remote MCP server.
 * All diagnostic logs are sent strictly to stderr to keep stdout clean for JSON-RPC.
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

const DEFAULT_REMOTE_URL = "https://thread-vault-db-testing.onrender.com/zStpO9S-zb3JtCPfb2ieZhN8wYxPRIPNJsAuInnt6mY/sse";
const remoteUrl = process.argv.find(arg => arg.startsWith("http")) || process.env.EOXS_REMOTE_URL || DEFAULT_REMOTE_URL;
const isCheckMode = process.argv.includes("--check") || process.argv.includes("--test");

const CONFIG_DIR = path.join(os.homedir(), ".eoxs");
const TOKEN_FILE = path.join(CONFIG_DIR, "token.json");
const LOCAL_ENV_FILE = path.join(__dirname, "..", ".env");

// OPTION 1: You can paste your token directly between the quotes below (if required by server):
const DIRECT_TOKEN = ""; 

// Auto-load .env file if present in Plugins folder
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

function log(...args) {
  console.error("[AskCruz Bridge]", ...args);
}

// 1. Retrieve the authentication token (optional if token is in the URL)
function getToken() {
  if (DIRECT_TOKEN && DIRECT_TOKEN.trim().length > 0) {
    log("Authentication: Using token pasted directly in bridge.js.");
    return DIRECT_TOKEN.trim();
  }

  if (process.env.ASKCRUZ_API_TOKEN || process.env.EOXS_API_TOKEN) {
    const token = (process.env.ASKCRUZ_API_TOKEN || process.env.EOXS_API_TOKEN).trim();
    log("Authentication: Using token from environment / .env file.");
    return token;
  }

  if (fs.existsSync(TOKEN_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
      if (data && data.token) {
        log(`Authentication: Using saved token from ${TOKEN_FILE}`);
        return data.token.trim();
      }
    } catch (e) {}
  }

  // If the remote URL already contains an embedded token / path, token header is optional
  log("Authentication: URL-based auth detected or no token header provided.");
  return null;
}

// 2. Bridge Claude stdio to Remote MCP Endpoint
function startBridge(token) {
  log(`Target Endpoint: ${remoteUrl}`);
  if (token) {
    log(`Auth Header: Attached x-auth-token (${token.slice(0, 6)}...)`);
  } else {
    log(`Auth: URL-based authentication`);
  }

  const targetUrl = new URL(remoteUrl);
  const isHttps = targetUrl.protocol === "https:";
  const clientLib = isHttps ? https : http;

  const authHeaders = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream"
  };
  if (token) {
    authHeaders["x-auth-token"] = token;
  }

  let postEndpointUrl = null;

  // Initial handshake / SSE connection
  const reqHeaders = {
    "Accept": "text/event-stream, application/json"
  };
  if (token) {
    reqHeaders["x-auth-token"] = token;
  }

  const checkReq = clientLib.request(targetUrl, {
    method: "GET",
    headers: reqHeaders
  }, (res) => {
    if (res.statusCode === 401) {
      log("❌ 401 Unauthorized: Server rejected the token. Please verify credentials.");
      process.exit(1);
    }

    const contentType = res.headers["content-type"] || "";

    if (isCheckMode) {
      log(`✅ Verification successful! Server responded with HTTP ${res.statusCode}.`);
      process.exit(0);
    }

    if (res.statusCode === 200 && contentType.includes("event-stream")) {
      log("Connected via Server-Sent Events (SSE).");

      let buffer = "";
      res.on("data", (chunk) => {
        buffer += chunk.toString("utf-8");
        const lines = buffer.split("\n");
        buffer = lines.pop();

        let currentEvent = null;
        for (const line of lines) {
          if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            const data = line.slice(5).trim();
            if (currentEvent === "endpoint") {
              postEndpointUrl = new URL(data, remoteUrl).toString();
              log(`MCP Message endpoint updated to: ${postEndpointUrl}`);
            } else if (data) {
              process.stdout.write(data + "\n");
            }
          }
        }
      });

      res.on("end", () => {
        log("SSE stream closed by server.");
        process.exit(0);
      });
    } else {
      log(`Server responded with HTTP ${res.statusCode}. Ready for direct JSON-RPC POST.`);
      postEndpointUrl = remoteUrl;
      res.resume();
    }
  });

  checkReq.on("error", (err) => {
    if (isCheckMode) {
      log(`❌ Connection test failed: ${err.message}`);
      process.exit(1);
    }
    log(`Connection notice: ${err.message}. Defaulting to direct POST.`);
    postEndpointUrl = remoteUrl;
  });

  checkReq.end();

  if (isCheckMode) return;

  // Listen to Claude Desktop stdin line by line and forward to remote server
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const destUrl = new URL(postEndpointUrl || remoteUrl);
    const postLib = destUrl.protocol === "https:" ? https : http;

    const postReq = postLib.request(destUrl, {
      method: "POST",
      headers: authHeaders
    }, (postRes) => {
      let responseBody = "";
      postRes.on("data", chunk => responseBody += chunk.toString("utf-8"));
      postRes.on("end", () => {
        if (responseBody.trim()) {
          process.stdout.write(responseBody.trim() + "\n");
        }
      });
    });

    postReq.on("error", (err) => {
      log("Error dispatching JSON-RPC request to server:", err.message);
    });

    postReq.write(trimmed);
    postReq.end();
  });

  log("Bridge ready. Listening for Claude Desktop queries.");
}

const token = getToken();
startBridge(token);
