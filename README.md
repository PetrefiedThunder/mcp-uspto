# mcp-uspto

Search US Patent and Trademark Office for patents, trademarks, and applications.

> **Free API** — No API key required.

## Tools

| Tool | Description |
|------|-------------|
| `search_patents` | Search US patents using the PatentsView API. Supports full-text and field-specific queries. |
| `get_patent` | Get detailed information about a specific US patent by patent number. |
| `search_inventors` | Search patent inventors by name. |
| `search_assignees` | Search patent assignees (companies/organizations) by name. |
| `search_cpc` | Search CPC (Cooperative Patent Classification) codes and their descriptions. |
| `search_trademarks` | Search US trademark registrations by serial or registration number via USPTO TSDR. |

## Installation

```bash
git clone https://github.com/PetrefiedThunder/mcp-uspto.git
cd mcp-uspto
npm install
npm run build
```

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "uspto": {
      "command": "node",
      "args": ["/path/to/mcp-uspto/dist/index.js"]
    }
  }
}
```

## Usage with npx

```bash
npx mcp-uspto
```

## License

Apache-2.0
