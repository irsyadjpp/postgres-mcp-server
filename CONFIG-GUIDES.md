# MCP Configuration Guides

This directory contains example configuration files for AI assistants that support the Model Context Protocol (MCP).

## Available Configurations

| Configuration File | AI Assistant | Description |
|-------------------|--------------|-------------|
| `claude_config_example.json` | Claude Desktop | Configuration for Claude Desktop (Anthropic) |
| `config-cline.json` | Cline | Configuration for Cline VS Code extension |
| `config-github-copilot.json` | GitHub Copilot | Configuration for GitHub Copilot Chat |
| `config-antigravity.json` | Antigravity | Configuration for Google Antigravity IDE |

## Installation Instructions

### Claude Desktop

1. Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)
2. Copy the content from `claude_config_example.json`
3. Replace the placeholder values with your actual database credentials

### Cline (VS Code Extension)

1. Open VS Code settings (Cmd/Ctrl + ,)
2. Search for "Cline: MCP Servers"
3. Add the configuration from `config-cline.json`
4. Replace placeholder values with your database credentials

### GitHub Copilot Chat

1. Open VS Code settings
2. Search for "GitHub Copilot: MCP Servers"
3. Add the configuration from `config-github-copilot.json`
4. Replace placeholder values with your database credentials

### Antigravity IDE

1. Open Antigravity IDE settings
2. Navigate to MCP Servers configuration
3. Add the configuration from `config-antigravity.json`
4. Replace placeholder values with your database credentials

## Environment Variables

All configurations use the following environment variables:

- `DB_HOST`: PostgreSQL server hostname (default: 127.0.0.1)
- `DB_PORT`: PostgreSQL server port (default: 5432)
- `DB_USER`: Database username (default: postgres)
- `DB_PASSWORD`: Database password (required)
- `DB_NAME`: Database name (default: postgres)
- `DB_SSL`: Enable SSL connection (default: true)

## Multi-Database Configuration

For multiple databases, use the naming convention `DB_<NAME>_*`:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["@irsyadjpp/postgres-mcp-server@latest"],
      "env": {
        "DB_HOST": "127.0.0.1",
        "DB_PORT": "5432",
        "DB_USER": "postgres",
        "DB_PASSWORD": "your_password_here",
        "DB_NAME": "postgres",
        "DB_SSL": "true",
        "DB_PROD_HOST": "prod.example.com",
        "DB_PROD_PORT": "5432",
        "DB_PROD_USER": "app_user",
        "DB_PROD_PASSWORD": "prod_password",
        "DB_PROD_DATABASE": "production",
        "DB_PROD_SSL": "true"
      }
    }
  }
}
```

## Security Notes

- Never commit configuration files with actual passwords to version control
- Use environment variables or secret management tools for production
- Consider using connection pooling for production environments
- Enable SSL for all production database connections

## Troubleshooting

### Connection Issues

1. Verify PostgreSQL server is running and accessible
2. Check firewall rules allow connections to the database
3. Ensure the database user has necessary permissions
4. Test connection using `psql` or another PostgreSQL client

### MCP Server Not Starting

1. Ensure Node.js is installed (version 20+ recommended)
2. Run `npx @irsyadjpp/postgres-mcp-server@latest` to test
3. Check npm cache if experiencing issues: `npm cache clean --force`
4. Verify network connectivity to npm registry

### Permission Errors

1. Ensure the database user has `CONNECT` permission on the database
2. Grant necessary permissions: `GRANT ALL PRIVILEGES ON DATABASE your_database TO your_user;`
3. Check PostgreSQL `pg_hba.conf` for authentication settings

## Additional Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [PostgreSQL MCP Server GitHub](https://github.com/irsyadjpp/postgres-mcp-server)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
