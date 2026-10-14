import { execFile } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { join, relative, resolve, sep } from 'node:path'
import { harnessRoot } from '../../hooks/utils.mjs'

const execFileAsync = promisify(execFile)
const workspaceRoot = resolve(harnessRoot, '..')
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'coverage', '.next', '.turbo'])
const allowedCommands = new Set(['git', 'node', 'npm', 'npx', 'prisma', 'rg', 'tsc'])
const forbiddenCommandText = /(?:rm\s+-rf|git\s+(?:reset|clean|checkout|push)|npm\s+(?:publish|exec)|npm\s+run\s+(?:start|reset|seed|docker|deploy|.*remote)|npx\s+--(?:package|yes)|npx\s+prettier\s+--write|node\s+(?:-e|--eval|-p|--print)|prisma\s+(?:migrate|db\s+(?:push|execute|seed)|generate)|vercel|docker\s+system\s+prune)/i
const sensitivePathPattern = /(?:^|\/)(?:\.env(?:\..*)?|credentials?|secrets?|.*\.(?:pem|key|p12|pfx))$/i

function repositoryRoot(repository, roots) {
  if (roots.has(repository)) return roots.get(repository)
  const root = resolve(workspaceRoot, repository)
  if (!root.startsWith(`${workspaceRoot}${sep}`)) throw new Error(`Repository is outside workspace: ${repository}`)
  return root
}

function safePath(repository, path = '.', roots) {
  const root = repositoryRoot(repository, roots)
  const target = resolve(root, path)
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new Error(`Path escapes repository boundary: ${path}`)
  }
  if (sensitivePathPattern.test(relative(root, target))) throw new Error(`Sensitive path is blocked: ${path}`)
  return { root, target, relativePath: relative(root, target) || '.' }
}

async function collectFiles(directory, root, result = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue
    const target = join(directory, entry.name)
    if (entry.isDirectory()) await collectFiles(target, root, result)
    else result.push(relative(root, target))
  }
  return result.sort()
}

function output(stdout, stderr, exitCode = 0) {
  return JSON.stringify({ exitCode, stdout: stdout.slice(0, 20000), stderr: stderr.slice(0, 10000) })
}

async function runCommand({ repository, command, args = [], timeoutMs = 120000, roots = new Map() }) {
  if (!allowedCommands.has(command)) throw new Error(`Command is not allowed: ${command}`)
  const commandText = [command, ...args].join(' ')
  if (forbiddenCommandText.test(commandText)) throw new Error('Command is blocked by the workspace safety policy')
  const { root } = safePath(repository, '.', roots)
  try {
    const result = await execFileAsync(command, args, { cwd: root, timeout: timeoutMs, maxBuffer: 2_000_000 })
    return output(result.stdout ?? '', result.stderr ?? '', 0)
  } catch (error) {
    return output(error.stdout ?? '', error.stderr ?? '', typeof error.code === 'number' ? error.code : 1)
  }
}

function tool({ name, description, action, execute }) {
  return { name, description, agentId: '*', action, skill: '*', repository: '*', execute }
}

export function createWorkspaceTools({ roots = new Map() } = {}) {
  return [
    tool({
      name: 'read_file',
      description: 'Read a text file inside an allowed Nino repository.',
      action: 'read',
      execute: async ({ repository, path }) => {
        const { target, relativePath } = safePath(repository, path, roots)
        return JSON.stringify({ repository, path: relativePath, content: await readFile(target, 'utf8') })
      },
    }),
    tool({
      name: 'list_files',
      description: 'List files inside an allowed Nino repository, excluding generated dependencies.',
      action: 'inspect',
      execute: async ({ repository, path = '.' }) => {
        const { target, relativePath } = safePath(repository, path, roots)
        return JSON.stringify({ repository, path: relativePath, files: await collectFiles(target, repositoryRoot(repository, roots)) })
      },
    }),
    tool({
      name: 'search_text',
      description: 'Search source text with ripgrep inside an allowed Nino repository.',
      action: 'inspect',
      execute: async ({ repository, query, path = '.' }) => {
        const { relativePath } = safePath(repository, path, roots)
        return runCommand({ repository, command: 'rg', args: ['--line-number', '--hidden', '--glob', '!node_modules', '--glob', '!.git', query, relativePath], roots })
      },
    }),
    tool({
      name: 'run_check',
      description: 'Run an allowlisted repository check without shell interpolation.',
      action: 'run-checks',
      execute: (input) => runCommand({ ...input, roots }),
    }),
    tool({
      name: 'apply_patch',
      description: 'Apply a unified patch inside an allowed repository.',
      action: 'edit-source',
      execute: async ({ repository, patch }) => {
        if (typeof patch !== 'string' || patch.length === 0) throw new Error('Patch is required')
        if (sensitivePathPattern.test(patch)) throw new Error('Patch targets a sensitive path')
        const { root } = safePath(repository, '.', roots)
        return new Promise((resolveResult, reject) => {
          const child = execFile('apply_patch', [], { cwd: root, maxBuffer: 2_000_000 }, (error, stdout, stderr) => {
            if (error) reject(new Error(`${stderr || stdout || error.message}`))
            else resolveResult(output(stdout ?? '', stderr ?? ''))
          })
          child.stdin.end(patch)
        })
      },
    }),
  ]
}
