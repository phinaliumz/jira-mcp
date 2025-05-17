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

4. **Start the server**
   - Locally:
     ```sh
     npm run build
     node build/index.js
     ```
   - Or via the provided `start-server.sh` script (used by VS Code MCP integration).

5. **Using in VS Code**
   - Open the project in VS Code.
   - Ensure you have the Model Context Protocol extension installed.
   - The `.vscode/mcp.json` file will prompt you for your Jira credentials and OpenAI API key, then launch the server.
   - Use the MCP panel to access tools:
     - `list-projects`: List all accessible Jira projects
     - `query-issues`: Fetch issues by natural language (OpenAI-powered JQL conversion)
     - `create-issue`: Create a new issue (specify project key, summary, description, and optionally issue type)

## Example `.vscode/mcp.json`

Below is an example configuration for VS Code integration. This will prompt you for your Jira credentials and OpenAI API key, then launch the MCP server:

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
            "command": "/path-to/start-server.sh",
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

## Docker Usage
A `Dockerfile` is provided for containerized deployment. Build and run with:
```sh
docker build -t jira-mcp .
docker run -e JIRA_API_TOKEN=... -e JIRA_BASE_URL=... -e JIRA_EMAIL=... -e OPENAI_API_KEY=... jira-mcp
```

## Troubleshooting
- If you see "No projects found", check your Jira API token, email, and permissions.
- If issue creation fails, ensure the issue type exists in your project and the description is in Atlassian Document Format (ADF).
- Use the `list-projects` tool to confirm available project keys.
- For natural language queries, ensure your OpenAI API key is set and valid.

## License
MIT
