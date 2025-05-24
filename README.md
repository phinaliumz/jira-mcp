# Jira MCP Server

This project implements a Model Context Protocol (MCP) server in TypeScript for interacting with Jira Cloud. It exposes tools for querying and creating Jira issues using natural language (powered by OpenAI) and is designed for easy integration with LLM IDEs such as Visual Studio Code.

## Features
- Query Jira issues using natural language (OpenAI-powered JQL conversion)
- Create new Jira issues in any accessible project
- List all Jira projects visible to the current user
- Robust error handling and debug logging
- Docker and local deployment support

## Prerequisites
- Node.js (v18+ recommended)
- A Jira Cloud account with API access
- A Jira API token (generate at https://id.atlassian.com/manage-profile/security/api-tokens)
- (Optional, but recommended) An OpenAI API key for natural language queries

## Setup
1. **Clone the repository**
   ```sh
   git clone <your-repo-url>
   cd jira-mcp
   ```
2. **Install dependencies**
   ```sh
   npm install
   ```
3. **Configure environment variables**
   - The server expects the following environment variables:
     - `JIRA_API_TOKEN`: Your Jira API token
     - `JIRA_BASE_URL`: Your Jira Cloud base URL (e.g., `https://your-domain.atlassian.net`)
     - `JIRA_EMAIL`: Your Jira account email
     - `OPENAI_API_KEY`: Your OpenAI API key (for natural language queries)
   - When using with VS Code, these are prompted via `.vscode/mcp.json`.

4. **Build the server**
   - Before running, you must build the TypeScript project:
     ```sh
     npm run build
     ```
   - This compiles the TypeScript source into JavaScript in the `build/` directory.

5. **Using in VS Code**
   - Open the project in VS Code.
   - Ensure you have the Model Context Protocol extension installed.
   - The `.vscode/mcp.json` file will prompt you for your Jira credentials and OpenAI API key, then launch the server using the npm script.
   - Use the MCP panel to access tools:
     - `list-projects`: List all accessible Jira projects
     - `query-issues`: Fetch issues by natural language (OpenAI-powered JQL conversion)
     - `create-issue`: Create a new issue (specify project key, summary, description, and optionally issue type)

## Example `.vscode/mcp.json`

Below is an example configuration for VS Code integration. This will prompt you for your Jira credentials and OpenAI API key, then launch the MCP server using the npm script:

```jsonc
{
    "inputs": [
        {
            "type": "promptString",
            "id": "jira-key",
            "description": "Jira API Key",
            "password": true
        },
        {
            "type": "promptString",
            "id": "jira-base-url-key",
            "description": "Jira Base URL"
        },
        {
            "type": "promptString",
            "id": "jira-email-key",
            "description": "Jira Email"
        },
        {
            "type": "promptString",
            "id": "openapi-api-key",
            "description": "OpenAI API Key",
            "password": true
        }
    ],
    "servers": {
        "jira-mcp": {
            "type": "stdio",
            "command": "sh",
            "args": [
                "-c",
                "cd \"${workspaceFolder}\" && npm run start"
            ],
            "env": {
                "JIRA_API_TOKEN": "${input:jira-key}",
                "JIRA_BASE_URL": "${input:jira-base-url-key}",
                "JIRA_EMAIL": "${input:jira-email-key}",
                "OPENAI_API_KEY": "${input:openapi-api-key}"
            }
        }
    }
}
```

## VS Code Integration Tip
If you want your MCP server to work for anyone who clones the repository, make sure your `.vscode/mcp.json` server command uses:

```jsonc
"command": "sh",
"args": [
    "-c",
    "cd \"${workspaceFolder}\" && npm run start"
]
```

This ensures the server always starts in the correct directory, regardless of where the project is cloned. `${workspaceFolder}` is replaced by VS Code with the root of the opened project. For users running outside VS Code, instruct them to start the server from the project root.

## Troubleshooting
- If you see "No projects found", check your Jira API token, email, and permissions.
- If issue creation fails, ensure the issue type exists in your project and the description is in Atlassian Document Format (ADF).
- Use the `list-projects` tool to confirm available project keys.
- For natural language queries, ensure your OpenAI API key is set and valid.

## License
MIT
