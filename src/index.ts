import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "jira-mcp",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Add type annotations for the Jira issue response
interface JiraIssue {
  key: string;
  fields: {
    summary: string;
  };
}

// Add a tool to fetch Jira issues
server.tool(
  "fetch-issues",
  "Fetch Jira issues based on JQL query",
  {
    jql: z.string().describe("Jira Query Language (JQL) string to filter issues"),
  },
  async ({ jql }) => {
    const jiraBaseUrl = process.env.JIRA_BASE_URL;
    const jiraApiToken = process.env.JIRA_API_TOKEN;
    const jiraEmail = process.env.JIRA_EMAIL;

    if (!jiraBaseUrl || !jiraApiToken || !jiraEmail) {
      return {
        content: [
          {
            type: "text",
            text: "JIRA_BASE_URL, JIRA_API_TOKEN, and JIRA_EMAIL environment variables must be set.",
          },
        ],
      };
    }

    // Use default JQL if none is provided
    const effectiveJql = jql || "assignee = currentUser()";
    console.log("Fetching issues with JQL:", effectiveJql);

    const response = await fetch(`${jiraBaseUrl}/rest/api/3/search?jql=${encodeURIComponent(effectiveJql)}`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString("base64")}`,
        Accept: "application/json",
        "Accept-Language": "en-US",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch issues: ${response.statusText}. Details: ${errorBody}. The encoded JQL is: ${encodeURIComponent(effectiveJql)}`,
          },
        ],
      };
    }

    const data: { issues: JiraIssue[] } = await response.json();
    const issues = data.issues.map((issue) => `Key: ${issue.key}, Summary: ${issue.fields.summary}`).join("\n");

    return {
      content: [
        {
          type: "text",
          text: issues || "No issues found.",
        },
      ],
    };
  }
);

// Add a tool to handle natural language queries
server.tool(
  "query-issues",
  "Handle natural language queries to fetch Jira issues",
  {
    query: z.string().describe("Natural language query to fetch Jira issues"),
  },
  async ({ query }) => {
    // Simple predefined mapping for demonstration
    const queryToJqlMap: Record<string, string> = {
      "what issues do I have assigned": "assignee = currentUser()",
      "what issues are in progress": "status = 'In Progress'",
      "what issues I have now": "assignee = currentUser() AND status != Done"
    };

    const jql = queryToJqlMap[query.toLowerCase()];

    if (!jql) {
      return {
        content: [
          {
            type: "text",
            text: "Sorry, I couldn't understand your query. Please try a different phrasing.",
          },
        ],
      };
    }

    // Reuse the fetch-issues logic directly
    const jiraBaseUrl = process.env.JIRA_BASE_URL;
    const jiraApiToken = process.env.JIRA_API_TOKEN;
    const jiraEmail = process.env.JIRA_EMAIL;

    if (!jiraBaseUrl || !jiraApiToken || !jiraEmail) {
      return {
        content: [
          {
            type: "text",
            text: "JIRA_BASE_URL, JIRA_API_TOKEN, and JIRA_EMAIL environment variables must be set.",
          },
        ],
      };
    }

    const response = await fetch(`${jiraBaseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString("base64")}`,
        Accept: "application/json",
        "Accept-Language": "en-US",
      },
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch issues: ${response.statusText}, encoded JQL: ${encodeURIComponent(jql)}`,
          },
        ],
      };
    }

    const data: { issues: JiraIssue[] } = await response.json();
    const issues = data.issues.map((issue) => `Key: ${issue.key}, Summary: ${issue.fields.summary}`).join("\n");

    return {
      content: [
        {
          type: "text",
          text: issues || "No issues found.",
        },
      ],
    };
  }
);

// Add a tool to create a Jira issue
server.tool(
  "create-issue",
  "Create a new Jira issue",
  {
    projectKey: z.string().describe("The key of the Jira project (e.g., 'PROJ')"),
    summary: z.string().describe("A brief summary of the issue"),
    description: z.string().optional().describe("A detailed description of the issue"),
  },
  async ({ projectKey, summary, description }) => {
    const jiraBaseUrl = process.env.JIRA_BASE_URL;
    const jiraApiToken = process.env.JIRA_API_TOKEN;
    const jiraEmail = process.env.JIRA_EMAIL;

    if (!jiraBaseUrl || !jiraApiToken || !jiraEmail) {
      return {
        content: [
          {
            type: "text",
            text: "JIRA_BASE_URL, JIRA_API_TOKEN, and JIRA_EMAIL environment variables must be set.",
          },
        ],
      };
    }

    const response = await fetch(`${jiraBaseUrl}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString("base64")}`,
        Accept: "application/json",
        "Accept-Language": "en-US",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          summary,
          description,
          issuetype: { name: "Task" },
        },
      }),
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to create issue: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Issue created successfully! Key: ${data.key}`,
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Jira MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
