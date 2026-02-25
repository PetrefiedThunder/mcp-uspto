#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const PATENTSVIEW_URL = "https://search.patentsview.org/api/v1";
const TSDR_URL = "https://tsdrapi.uspto.gov";
const USER_AGENT = "mcp-uspto/1.0.0 (https://github.com/PetrefiedThunder/mcp-uspto)";
const RATE_LIMIT_MS = 500; // conservative

let lastRequestTime = 0;

async function rateLimitedFetch(url: string, options?: RequestInit): Promise<any> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();

  const res = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`USPTO API error: ${res.status} ${res.statusText} — ${body.slice(0, 500)}`);
  }
  return res.json();
}

const server = new McpServer({
  name: "mcp-uspto",
  version: "1.0.0",
});

// Patent search via PatentsView
server.tool(
  "search_patents",
  "Search US patents using the PatentsView API. Supports full-text and field-specific queries.",
  {
    query: z.string().describe("Search text (searches title and abstract)"),
    assignee: z.string().optional().describe("Filter by assignee/company name"),
    inventor: z.string().optional().describe("Filter by inventor name"),
    dateFrom: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    dateTo: z.string().optional().describe("End date (YYYY-MM-DD)"),
    cpcCode: z.string().optional().describe("CPC classification code (e.g. 'H04L')"),
    size: z.number().min(1).max(100).default(10),
  },
  async ({ query, assignee, inventor, dateFrom, dateTo, cpcCode, size }) => {
    const filters: any[] = [];

    if (query) {
      filters.push({
        _or: [
          { _text_any: { patent_title: query } },
          { _text_any: { patent_abstract: query } },
        ],
      });
    }
    if (assignee) {
      filters.push({ _text_any: { "assignees.assignee_organization": assignee } });
    }
    if (inventor) {
      filters.push({
        _or: [
          { _text_any: { "inventors.inventor_first_name": inventor } },
          { _text_any: { "inventors.inventor_last_name": inventor } },
        ],
      });
    }
    if (dateFrom || dateTo) {
      const dateFilter: any = {};
      if (dateFrom) dateFilter._gte = { patent_date: dateFrom };
      if (dateTo) dateFilter._lte = { patent_date: dateTo };
      if (dateFrom && dateTo) {
        filters.push({ _and: [{ _gte: { patent_date: dateFrom } }, { _lte: { patent_date: dateTo } }] });
      } else if (dateFrom) {
        filters.push({ _gte: { patent_date: dateFrom } });
      } else {
        filters.push({ _lte: { patent_date: dateTo } });
      }
    }
    if (cpcCode) {
      filters.push({ _begins: { "cpcs.cpc_group_id": cpcCode } });
    }

    const body = {
      q: filters.length === 1 ? filters[0] : filters.length > 1 ? { _and: filters } : { _gte: { patent_date: "1790-01-01" } },
      f: [
        "patent_id", "patent_title", "patent_date", "patent_abstract",
        "patent_num_claims", "patent_type",
      ],
      o: { per_page: size },
      s: [{ patent_date: "desc" }],
    };

    const data = await rateLimitedFetch(`${PATENTSVIEW_URL}/patent/`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// Get patent details
server.tool(
  "get_patent",
  "Get detailed information about a specific US patent by patent number.",
  {
    patentId: z.string().describe("Patent number (e.g. '11,234,567' or '11234567')"),
  },
  async ({ patentId }) => {
    const cleanId = patentId.replace(/,/g, "").trim();

    const body = {
      q: { patent_id: cleanId },
      f: [
        "patent_id", "patent_title", "patent_date", "patent_abstract",
        "patent_num_claims", "patent_type", "patent_num_cited_by_us_patents",
        "patent_num_combined_citations",
      ],
      o: { per_page: 1, matched_subentities_only: false },
    };

    const data = await rateLimitedFetch(`${PATENTSVIEW_URL}/patent/`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// Search inventors
server.tool(
  "search_inventors",
  "Search patent inventors by name.",
  {
    name: z.string().describe("Inventor name to search"),
    size: z.number().min(1).max(100).default(10),
  },
  async ({ name, size }) => {
    const body = {
      q: {
        _or: [
          { _text_any: { inventor_first_name: name } },
          { _text_any: { inventor_last_name: name } },
        ],
      },
      f: [
        "inventor_id", "inventor_first_name", "inventor_last_name",
        "inventor_total_num_patents",
      ],
      o: { per_page: size },
      s: [{ inventor_total_num_patents: "desc" }],
    };

    const data = await rateLimitedFetch(`${PATENTSVIEW_URL}/inventor/`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// Search assignees (companies/organizations)
server.tool(
  "search_assignees",
  "Search patent assignees (companies/organizations) by name.",
  {
    name: z.string().describe("Organization/company name to search"),
    size: z.number().min(1).max(100).default(10),
  },
  async ({ name, size }) => {
    const body = {
      q: { _text_any: { assignee_organization: name } },
      f: [
        "assignee_id", "assignee_organization", "assignee_type",
        "assignee_total_num_patents",
      ],
      o: { per_page: size },
      s: [{ assignee_total_num_patents: "desc" }],
    };

    const data = await rateLimitedFetch(`${PATENTSVIEW_URL}/assignee/`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// CPC classification lookup
server.tool(
  "search_cpc",
  "Search CPC (Cooperative Patent Classification) codes and their descriptions.",
  {
    query: z.string().describe("CPC code prefix or keyword (e.g. 'H04L' or 'machine learning')"),
    size: z.number().min(1).max(100).default(10),
  },
  async ({ query, size }) => {
    const isCode = /^[A-H]\d/.test(query);
    const body = {
      q: isCode
        ? { _begins: { cpc_subgroup_id: query } }
        : { _text_any: { cpc_subgroup_title: query } },
      f: ["cpc_subgroup_id", "cpc_subgroup_title"],
      o: { per_page: size },
    };

    const data = await rateLimitedFetch(`${PATENTSVIEW_URL}/cpc_subgroup/`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// Trademark search via TSDR
server.tool(
  "search_trademarks",
  "Search US trademark registrations by serial or registration number via USPTO TSDR.",
  {
    serialNumber: z.string().optional().describe("Trademark serial number (e.g. '97123456')"),
    registrationNumber: z.string().optional().describe("Trademark registration number (e.g. '6123456')"),
  },
  async ({ serialNumber, registrationNumber }) => {
    if (!serialNumber && !registrationNumber) {
      return {
        content: [{ type: "text" as const, text: "Provide either serialNumber or registrationNumber" }],
      };
    }

    const type = serialNumber ? "sn" : "rn";
    const number = serialNumber || registrationNumber;
    const url = `${TSDR_URL}/ts/cd/casestatus/${type}${number}/info.json`;

    const data = await rateLimitedFetch(url);
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
