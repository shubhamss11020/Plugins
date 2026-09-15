# Raj's AskCruz & Thread Vault Plugin Suite for Claude

Configured for **Raj**, featuring 5 dedicated MCP servers and matching skills.

---

## 1. The 5 MCP Connectors & Skills

| # | Connector ID | Name | Endpoint URL | Authentication | Skill Directory |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `threads-wiki` | **Threads-wiki** | `https://mcp.askcruz.com/wiki/mcp` | `x-auth-token` | `skills/threads-wiki/SKILL.md` |
| **2** | `threads-ov` | **Threads-OV** | `https://.../sse` | **Direct URL (No auth header)** | `skills/threads-ov/SKILL.md` |
| **3** | `ceo` | **CEO** | `https://mcp.askcruz.com/ceo/mcp` | `x-auth-token` | `skills/ceo/SKILL.md` |
| **4** | `ask-cruz` | **Ask Cruz** | `https://mcp.askcruz.com/team/mcp` | `x-auth-token` | `skills/ask-cruz/SKILL.md` |
| **5** | `team-eoxs` | **Team EOXS** | `https://mcpeoxsteamlive.lancerdevops.me/mcp` | **Direct URL (No auth header)** | `skills/team-eoxs/SKILL.md` |

---

## 2. Header & Token Configuration

Configure your URLs and tokens directly in [config.json](file:///c:/Users/shubh/OneDrive/Desktop/Plugins/config.json):

```json
{
  "defaultHeaderName": "x-auth-token",
  "defaultToken": "YOUR_TOKEN_HERE",
  "servers": {
    "threads-wiki": {
      "name": "Threads-wiki",
      "url": "https://mcp.askcruz.com/wiki/mcp",
      "headerName": "x-auth-token",
      "token": "YOUR_TOKEN_HERE"
    },
    "threads-ov": {
      "name": "Threads-OV",
      "url": "https://thread-vault-db-testing.onrender.com/.../sse",
      "noAuth": true
    },
    "ceo": {
      "name": "CEO",
      "url": "https://mcp.askcruz.com/raj/mcp",
      "headerName": "x-auth-token",
      "token": "YOUR_TOKEN_HERE"
    },
    "ask-cruz": {
      "name": "Ask Cruz",
      "url": "https://mcp.askcruz.com/team/mcp",
      "headerName": "x-auth-token",
      "token": "YOUR_TOKEN_HERE"
    },
    "team-eoxs": {
      "name": "Team EOXS",
      "url": "https://mcpeoxsteamlive.lancerdevops.me/mcp",
      "noAuth": true
    }
  }
}
```

> [!NOTE]
> Both `threads-ov` and `team-eoxs` are configured with `"noAuth": true` so they communicate directly without sending any authentication headers.

---

## 3. Claude Desktop Setup

All 5 servers are already registered in your Claude Desktop configuration (`%APPDATA%\Claude\claude_desktop_config.json`).

To install or refresh on any new machine, run:
```powershell
node scripts/install.js
```
or double-click **`setup.bat`**.
