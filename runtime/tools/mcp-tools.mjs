import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

/**
 * MCP server descriptor for the Nino integration endpoint, shaped for Claude
 * Code's `--mcp-config` flag. The CLI materializes it as a temporary file and
 * passes that file to Claude and translates stdio servers to Codex's native
 * `--config mcp_servers.*` overrides.
 */
export function mcpServerConfig(environment = process.env) {
  const name = environment.NINO_MCP_NAME ?? 'nino-mcp'
  const token = environment.NINO_MCP_TOKEN
  const headers = token ? { authorization: `Bearer ${token}` } : undefined

  if (environment.NINO_MCP_URL) {
    return { mcpServers: { [name]: { type: 'http', url: environment.NINO_MCP_URL, headers } } }
  }
  if (environment.NINO_MCP_SSE_URL) {
    return { mcpServers: { [name]: { type: 'sse', url: environment.NINO_MCP_SSE_URL, headers } } }
  }
  if (environment.NINO_MCP_COMMAND) {
    return {
      mcpServers: {
        [name]: {
          type: 'stdio',
          command: environment.NINO_MCP_COMMAND,
          args: environment.NINO_MCP_ARGS ? JSON.parse(environment.NINO_MCP_ARGS) : [],
        },
      },
    }
  }
  return null
}

/**
 * Kept for compatibility with callers that expect a tool-registration shape
 * (`{ tools, close }`). The native CLI owns MCP execution; this function only
 * materializes the shared descriptor and keeps its temporary file lifecycle.
 */
export async function createMcpTools({ environment = process.env } = {}) {
  const config = mcpServerConfig(environment)
  if (!config) return { tools: [], config: null, mcpConfigPath: null, close: async () => {} }

  const directory = await mkdtemp(join(tmpdir(), 'nino-mcp-'))
  const configPath = join(directory, 'servers.json')
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
  return {
    tools: [],
    config,
    mcpConfigPath: configPath,
    close: () => rm(directory, { recursive: true, force: true }),
  }
}
