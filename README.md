# mcp-uspto

MCP server for US Patent and Trademark Office data. Search patents via [PatentsView](https://patentsview.org) and trademarks via USPTO TSDR. No API key required.

## Tools

| Tool | Description |
|------|-------------|
| `search_patents` | Full-text patent search with filters (assignee, inventor, date, CPC code) |
| `get_patent` | Get detailed patent info by patent number |
| `search_inventors` | Search patent inventors by name |
| `search_assignees` | Search patent assignees/companies by name |
| `search_cpc` | Look up CPC classification codes and descriptions |
| `search_trademarks` | Look up trademark status by serial/registration number |

## Install

```bash
npm install
npm run build
```

## Usage with Claude Desktop

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

## Examples

- Search patents about "machine learning" from Google: `search_patents(query: "machine learning", assignee: "Google")`
- Get patent details: `get_patent(patentId: "11234567")`
- Find prolific inventors: `search_inventors(name: "Hinton")`
- Look up CPC codes: `search_cpc(query: "H04L")` or `search_cpc(query: "neural network")`
- Check trademark status: `search_trademarks(serialNumber: "97123456")`

## Rate Limits

Conservative rate limiting (2 req/s) is enforced automatically. No API key needed.

## License

MIT
