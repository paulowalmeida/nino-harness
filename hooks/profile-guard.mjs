import { parseRegistryAgents, printResult, readText } from './utils.mjs'

const registry = await readText('agents/registry.yaml')
const agents = parseRegistryAgents(registry)
const errors = []

for (const agent of agents) {
  let profile
  try {
    profile = await readText(`agents/${agent.id}.md`)
  } catch {
    continue
  }

  const frontmatter = profile.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatter) errors.push(`${agent.id}: missing YAML frontmatter`)
  else {
    if (!new RegExp(`^name:\\s*${agent.id}\\s*$`, 'm').test(frontmatter[1])) {
      errors.push(`${agent.id}: frontmatter name does not match registry id`)
    }
    if (!/^description:\s*.+$/m.test(frontmatter[1])) {
      errors.push(`${agent.id}: frontmatter description is missing`)
    }
  }

  if (!/^## (?:Mission|Missão)\s*$/m.test(profile)) errors.push(`${agent.id}: missing Mission section`)
  if (!/^## (?:Output|Implementation handoff|Formato de saída|Critério de sucesso)\s*$/m.test(profile)) {
    errors.push(`${agent.id}: missing output or completion section`)
  }
}

const passed = printResult('profile-guard', errors)
if (!passed) process.exitCode = 1
