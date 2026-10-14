import assert from 'node:assert/strict'
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createClaudeCodeAgentRunner, createCodexAgentRunner } from '../agent-runner.mjs'
import { createMcpTools } from '../tools/mcp-tools.mjs'

const telemetry = {
  startSpan: () => async () => {},
  event: async () => {},
}

async function fakeCli(directory, body) {
  const script = join(directory, 'fake-cli.mjs')
  await writeFile(script, `#!/usr/bin/env node\n${body}\n`, 'utf8')
  await chmod(script, 0o755)
  return script
}

test('Claude runner is headless and forwards MCP configuration', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'nino-harness-runner-'))
  try {
    const argsPath = join(directory, 'claude-args.json')
    const command = join(directory, 'fake-claude.sh')
    await writeFile(command, `#!/bin/sh\nprintf '%s\\n' "$@" > ${argsPath}\nprintf '%s\\n' '{"result":"{\\"status\\":\\"APPROVED\\"}","session_id":"claude-session"}'\n`, 'utf8')
    await chmod(command, 0o755)
    const runner = createClaudeCodeAgentRunner({
      command,
      mcpConfigPath: '/tmp/nino-mcp.json',
      maxRetries: 0,
      timeoutMs: 1000,
    })

    const result = await runner({
      agent: { id: 'product-owner' },
      profile: 'profile',
      prompt: 'prompt',
      repository: 'nino-app',
      telemetry,
    })
    const args = (await readFile(argsPath, 'utf8')).trim().split('\n')

    assert.equal(JSON.parse(result.output).status, 'APPROVED')
    assert.deepEqual(args.slice(args.indexOf('--permission-prompts'), args.indexOf('--permission-prompts') + 2), ['--permission-prompts', 'none'])
    assert.deepEqual(args.slice(args.indexOf('--mcp-config'), args.indexOf('--mcp-config') + 2), ['--mcp-config', '/tmp/nino-mcp.json'])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('Codex runner forwards native MCP overrides and supports ephemeral execution', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'nino-harness-runner-'))
  try {
    const argsPath = join(directory, 'codex-args.json')
    const command = await fakeCli(directory, `
      const { writeFile } = await import('node:fs/promises')
      const args = process.argv.slice(2)
      await writeFile(${JSON.stringify(argsPath)}, JSON.stringify(args))
      const outputPath = args[args.indexOf('--output-last-message') + 1]
      await writeFile(outputPath, JSON.stringify({ status: 'APPROVED' }))
      console.log(JSON.stringify({ type: 'thread.started', thread_id: 'codex-thread' }))
      console.log(JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 1 } }))
    `)
    const runner = createCodexAgentRunner({
      command,
      ephemeral: true,
      mcpConfig: { mcpServers: { nino: { type: 'stdio', command: 'node', args: ['server.mjs'] } } },
      maxRetries: 0,
      timeoutMs: 1000,
    })

    const result = await runner({
      agent: { id: 'qa' },
      profile: 'profile',
      prompt: 'prompt',
      repository: 'nino-app',
      telemetry,
    })
    const args = JSON.parse(await readFile(argsPath, 'utf8'))

    assert.equal(JSON.parse(result.output).status, 'APPROVED')
    assert.ok(args.includes('--ephemeral'))
    assert.ok(args.includes('mcp_servers.nino.command="node"'))
    assert.ok(args.includes('mcp_servers.nino.args=["server.mjs"]'))
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('MCP tools materialize and clean up the shared native configuration', async () => {
  const mcp = await createMcpTools({
    environment: {
      NINO_MCP_NAME: 'test-server',
      NINO_MCP_COMMAND: 'node',
      NINO_MCP_ARGS: '["server.mjs"]',
    },
  })

  try {
    assert.match(await readFile(mcp.mcpConfigPath, 'utf8'), /test-server/)
    assert.equal(mcp.config.mcpServers['test-server'].command, 'node')
  } finally {
    await mcp.close()
  }

  await assert.rejects(() => readFile(mcp.mcpConfigPath, 'utf8'))
})
