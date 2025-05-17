import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";

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
    status?: { name: string };
  };
}

// Function to convert natural language to JQL using OpenAI API
async function nlToJql(query: string): Promise<string | undefined> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) return undefined;
  const prompt = `Given the following Jira query in natural language, return only the corresponding JQL. Do not include any explanation, formatting, or code block markers. Just output the JQL string.\n\nQuery: "${query}"`;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-nano",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 50,
      temperature: 0
    })
  });
  const data = await response.json();

  return data.choices?.[0]?.message?.content?.trim();
}

// Add a tool to handle natural language queries
server.tool(
  "query-issues",
  "Handle natural language queries to fetch Jira issues",
  {
    query: z.string().describe("Natural language query to fetch Jira issues"),
  },
  async ({ query }) => {
    let jql: string | undefined;
    // Try OpenAI LLM for NL to JQL conversion
    jql = await nlToJql(query);

    if (!jql) {
      // Fallback: simple keyword mapping
      const q = query.toLowerCase();
      if (q.includes("assigned to me") || q.includes("my issues")) {
        jql = "assignee = currentUser()";
      } else if (q.includes("in progress")) {
        jql = "status = 'In Progress'";
      } else if (q.includes("open") || q.includes("not done")) {
        jql = "statusCategory != Done";
      } else if (q.includes("created by me")) {
        jql = "reporter = currentUser()";
      } else if (q.includes("all issues")) {
        jql = "";
      }
    }
    if (!jql) {
      return {
        content: [
          {
            type: "text",
            text: "Sorry, I couldn't understand your query. Try rephrasing or use keywords like 'assigned to me', 'in progress', 'open', etc.",
          },
        ],
      };
    }

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
    const issues = data.issues.map((issue) => `Key: ${issue.key}, Summary: ${issue.fields.summary}, Status: ${issue.fields.status?.name || 'Unknown'}`).join("\n");

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
    issueType: z.string().optional().describe("The issue type name (e.g., 'Task', 'Story', 'Bug')"),
  },
  async ({ projectKey, summary, description, issueType }) => {
    const jiraBaseUrl = process.env.JIRA_BASE_URL?.trim();
    const jiraApiToken = process.env.JIRA_API_TOKEN?.trim();
    const jiraEmail = process.env.JIRA_EMAIL?.trim();

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

    // Use "Task" as default issue type if not provided
    const issueTypeName = issueType || "Task";

    // Format description as Atlassian Document Format (ADF) if provided
    const adfDescription = description
      ? {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: description,
                },
              ],
            },
          ],
        }
      : undefined;

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
          summary: summary,
          description: adfDescription,
          issuetype: { name: issueTypeName },
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        content: [
          {
            type: "text",
            text: `Failed to create issue: ${response.statusText}. Details: ${errorBody}`,
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

// Add a tool to list all visible Jira projects
server.tool(
  "list-projects",
  "List all Jira projects visible to the current user",
  {},
  async () => {
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

    const response = await fetch(`${jiraBaseUrl}/rest/api/3/project/search`, {
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
            text: `Failed to list projects: HTTP ${response.status} ${response.statusText}. Details: ${errorBody}`,
          },
        ],
      };
    }

    const data = await response.json();
    const projects = (data.values || data.projects || []).map((p: any) => `Key: ${p.key}, Name: ${p.name}`).join("\n");
    return {
      content: [
        {
          type: "text",
          text: projects || "No projects found.",
        },
      ],
    };
  }
);

// Add a tool to assign a Jira issue to the current user
server.tool(
  "assign-issue-to-me",
  "Assign a Jira issue to the current user",
  {
    issueIdOrKey: z.string().describe("The ID or key of the Jira issue (e.g., 'PROJ-123')"),
  },
  async ({ issueIdOrKey }) => {
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

    // Assign to the current user (the API requires accountId, which can be fetched from /myself)
    // Fetch the current user's accountId
    const myselfResp = await fetch(`${jiraBaseUrl}/rest/api/3/myself`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString("base64")}`,
        Accept: "application/json",
        "Accept-Language": "en-US",
      },
    });
    if (!myselfResp.ok) {
      const errorBody = await myselfResp.text();
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch current user info: HTTP ${myselfResp.status} ${myselfResp.statusText}. Details: ${errorBody}`,
          },
        ],
      };
    }
    const myself = await myselfResp.json();
    const accountId = myself.accountId;
    if (!accountId) {
      return {
        content: [
          {
            type: "text",
            text: "Could not determine current user's accountId.",
          },
        ],
      };
    }

    // Assign the issue
    const response = await fetch(`${jiraBaseUrl}/rest/api/3/issue/${encodeURIComponent(issueIdOrKey)}/assignee`, {
      method: "PUT",
      headers: {
        Authorization: `Basic ${Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString("base64")}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "Accept-Language": "en-US",
      },
      body: JSON.stringify({ accountId }),
    });

    if (response.status === 204) {
      return {
        content: [
          {
            type: "text",
            text: `Issue ${issueIdOrKey} assigned to you successfully.`,
          },
        ],
      };
    } else {
      const errorBody = await response.text();
      return {
        content: [
          {
            type: "text",
            text: `Failed to assign issue: HTTP ${response.status} ${response.statusText}. Details: ${errorBody}`,
          },
        ],
      };
    }
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
