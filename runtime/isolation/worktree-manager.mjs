import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join, resolve, sep } from 'node:path'
import { harnessRoot } from '../../hooks/utils.mjs'

const execFileAsync = promisify(execFile)
const workspaceRoot = resolve(harnessRoot, '..')
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'coverage', '.next', '.turbo'])
const sensitivePath = /(?:^|\/)(?:\.env(?:\..*)?|credentials?|secrets?|.*\.(?:pem|key|p12|pfx))$/i

function repositoryPath(repository) {
  const root = resolve(workspaceRoot, repository)
  if (!root.startsWith(workspaceRoot + sep)) throw new Error('Repository is outside workspace: ' + repository)
  return root
}

async function git(root, args, options = {}) {
  return execFileAsync('git', ['-C', root, ...args], {
    maxBuffer: 20_000_000,
    encoding: options.encoding ?? 'utf8',
  })
}

async function copyUntrackedFiles(sourceRoot, targetRoot) {
  const { stdout } = await git(sourceRoot, ['ls-files', '--others', '--exclude-standard', '-z'])
  for (const entry of stdout.toString().split('\0').filter(Boolean)) {
    if (sensitivePath.test(entry)) continue
    if (entry.split('/').some((part) => ignoredDirectories.has(part))) continue
    const source = resolve(sourceRoot, entry)
    const target = resolve(targetRoot, entry)
    if (!target.startsWith(targetRoot + sep)) throw new Error('Untracked file escapes worktree: ' + entry)
    const sourceInfo = await stat(source)
    if (!sourceInfo.isFile()) continue
    await mkdir(resolve(target, '..'), { recursive: true })
    await copyFile(source, target)
  }
}

export async function createIsolatedWorktrees({
  runId,
  repositories,
  state,
  stateStore,
  directory,
} = {}) {
  const rootDirectory = resolve(directory ?? join(harnessRoot, '.runs', 'worktrees'), runId)
  const roots = new Map()
  state.worktrees ??= {}
  for (const repository of [...new Set(repositories ?? [])]) {
    const sourceRoot = repositoryPath(repository)
    const worktreeRoot = join(rootDirectory, repository)
    await mkdir(rootDirectory, { recursive: true })
    await git(sourceRoot, ['worktree', 'add', '--detach', worktreeRoot, 'HEAD'])
    const { stdout: patch } = await git(sourceRoot, ['diff', '--binary', 'HEAD'], { encoding: 'buffer' })
    if (patch.length > 0) {
      const patchPath = join(rootDirectory, repository + '.diff')
      await writeFile(patchPath, patch)
      await git(worktreeRoot, ['apply', '--binary', patchPath])
    }
    await copyUntrackedFiles(sourceRoot, worktreeRoot)
    roots.set(repository, worktreeRoot)
    state.worktrees[repository] = { source: sourceRoot, path: worktreeRoot, isolatedAt: new Date().toISOString() }
  }
  await stateStore.save(state)
  return { roots, rootDirectory }
}

export function rootsFromState(state) {
  return new Map(Object.entries(state?.worktrees ?? {}).map(([repository, metadata]) => [repository, metadata.path]))
}
