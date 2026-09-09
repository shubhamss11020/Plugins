# EOXS Intern Plugin for Claude

A clean, production-ready Claude Desktop plugin integrating the AskCruz / EOXS live MCP remote server and custom skill instructions.

---

## Folder Structure

```text
Plugins/
├── plugin.json               # Plugin metadata
├── mcp_config.json           # Standard MCP config
├── README.md                 # Documentation
├── scripts/
│   ├── bridge.js             # Claude stdio <-> Remote HTTPS/SSE bridge
│   └── install.js            # Auto-installer script for Claude Desktop config
└── skills/
    └── eoxs-intern/
        └── SKILL.md          # ⬅️ PLACE YOUR SKILL .MD FILE HERE
```

---

## 1. Where to Add Your Skill File

Place your markdown skill file inside:
📁 **`skills/eoxs-intern/SKILL.md`**

*(Full path: `C:\Users\shubh\OneDrive\Desktop\Plugins\skills\eoxs-intern\SKILL.md`)*

---

## 2. Claude Desktop Integration (Automatic!)

**You do NOT need to manually edit Claude Desktop's config file.**

Claude Desktop has already been automatically configured with:
```json
"eoxs-intern": {
  "command": "node",
  "args": [
    "C:/Users/shubh/OneDrive/Desktop/Plugins/scripts/bridge.js",
    "https://mcp.askcruz.com/intern/mcp"
  ]
}
```

If you ever move this folder or set up a new machine, you can simply run:
```powershell
node scripts/install.js
```
This will automatically update `%APPDATA%\Claude\claude_desktop_config.json` while keeping your existing MCP servers safe.

---

## 3. Authentication Token

The bridge automatically loads your intern token from:
📁 **`C:\Users\shubh\.eoxs\token.json`**

File format:
```json
{
  "name": "Shubham",
  "token": "YOUR_VALID_TOKEN"
}
```

> [!NOTE]
> If your token expires or you receive a `401 Unauthorized` response, simply update the `"token"` field in `C:\Users\shubh\.eoxs\token.json` with your new token.

---

## 4. How to Use in Claude Desktop

1. **Restart Claude Desktop:**
   Completely exit Claude Desktop from the system tray (bottom-right of taskbar) and reopen it.
2. **Tools Verification:**
   Click the **hammer / tools icon** (🛠️) in any chat. You will see the EOXS tools available.
3. **Skill Instructions in Claude:**
   - In Claude Desktop, create a **Project** (e.g. *"EOXS Assistant"*).
   - In the project's **Set Custom Instructions**, paste the contents of your `SKILL.md`.
   - Now Claude will follow all skill instructions, call `get_index()` first, and enforce redaction rules!
