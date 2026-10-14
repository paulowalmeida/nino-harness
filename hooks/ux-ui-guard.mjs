import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseRegistryAgents, printResult, readText } from './utils.mjs'

const requiredSkills = [
  'ux-ui-design',
  'ux-ui-review',
  'visual-design',
  'responsive-design',
  'accessibility',
  'internationalization',
  'design-system',
]

const stageBlock = (workflow, stageId) => {
  const lines = workflow.split('\n')
  const start = lines.findIndex((line) => line === `  - id: ${stageId}`)
  if (start < 0) return ''
  const next = lines.findIndex((line, index) => index > start && /^  - id: /.test(line))
  return lines.slice(start, next < 0 ? lines.length : next).join('\n')
}

export function validateUxUiWorkflow(workflow) {
  const errors = []
  const positions = [
    'surface-discovery',
    'ux-design',
    'frontend',
    'ux-review',
    'qa',
  ].map((stage) => ({ stage, position: workflow.indexOf(`id: ${stage}`) }))

  if (positions.some(({ position }) => position < 0)) {
    errors.push('workflow must contain surface-discovery, ux-design, frontend, ux-review and qa')
  } else if (positions.some(({ position }, index) => index > 0 && position <= positions[index - 1].position)) {
    errors.push('workflow must order surface-discovery -> ux-design -> frontend -> ux-review -> qa')
  }

  const design = stageBlock(workflow, 'ux-design')
  if (!/^    agent: ux-ui\s*$/m.test(design)) errors.push('ux-design must be owned by ux-ui')
  if (!/^    dispatch: required\s*$/m.test(design)) errors.push('ux-design must require dispatch')
  if (!/^    output: ux-design\s*$/m.test(design)) errors.push('ux-design must emit ux-design')

  const frontend = stageBlock(workflow, 'frontend')
  if (!/^    dependsOn: \[[^\]]*ux-design[^\]]*\]\s*$/m.test(frontend)) {
    errors.push('frontend must depend on ux-design')
  }

  const review = stageBlock(workflow, 'ux-review')
  if (!/^    agent: ux-ui\s*$/m.test(review)) errors.push('ux-review must be owned by ux-ui')
  if (!/^    dependsOn: \[[^\]]*frontend[^\]]*\]\s*$/m.test(review)) {
    errors.push('ux-review must depend on frontend')
  }

  return errors
}

export async function validateUxUiGovernance() {
  const errors = []
  const registry = await readText('agents/registry.yaml')
  const agent = parseRegistryAgents(registry).find((candidate) => candidate.id === 'ux-ui')

  if (!agent) errors.push('ux-ui agent is missing from the registry')
  else {
    if (agent.status !== 'active') errors.push('ux-ui must be active')
    if (agent.role !== 'specialist') errors.push('ux-ui must be a specialist')
    for (const skill of requiredSkills) {
      if (!agent.skills?.includes(skill)) errors.push(`ux-ui must declare skill: ${skill}`)
    }
    for (const output of ['ux-design', 'ux-review']) {
      if (!agent.outputs?.includes(output)) errors.push(`ux-ui must declare output: ${output}`)
    }
    if (agent.permissions?.includes('edit-source')) errors.push('ux-ui must not have edit-source permission')
    if (!agent.forbidden?.includes('edit-source')) errors.push('ux-ui must explicitly forbid edit-source')
  }

  const profile = await readText('agents/ux-ui.md')
  for (const pattern of [
    /Define the screen before implementation/i,
    /WCAG 2\.2 Level AA/,
    /internationalization/i,
    /Design System/,
    /contracts\/ux-design\.schema\.json/,
    /contracts\/ux-review\.schema\.json/,
  ]) {
    if (!pattern.test(profile)) errors.push(`ux-ui profile is missing required policy: ${pattern}`)
  }

  const skill = await readText('skills/nino-ux-ui/SKILL.md')
  if (!/^name:\s*nino-ux-ui\s*$/m.test(skill)) errors.push('nino-ux-ui skill name is invalid')
  if (!/^description:\s*.+$/m.test(skill)) errors.push('nino-ux-ui skill description is missing')
  for (const term of ['responsive', 'accessibility', 'internationalization', 'Design System']) {
    if (!skill.toLowerCase().includes(term.toLowerCase())) errors.push(`nino-ux-ui skill must cover ${term}`)
  }

  const rule = await readText('rules/base/ux-ui.md')
  if (!/before\s+`frontend-dev` implements/i.test(rule)) errors.push('UX/UI rule must require design before frontend')
  if (!rule.includes('After implementation')) errors.push('UX/UI rule must require post-implementation review')

  for (const [path, required] of [
    ['contracts/ux-design.schema.json', ['id', 'taskId', 'surfaces', 'responsive', 'accessibility', 'internationalization', 'designSystem', 'implementationHandoff', 'status']],
    ['contracts/ux-review.schema.json', ['id', 'taskId', 'designId', 'criteria', 'findings', 'limitations', 'status']],
  ]) {
    try {
      const schema = JSON.parse(await readText(path))
      if (schema.additionalProperties !== false) errors.push(`${path} must reject additional properties`)
      for (const field of required) {
        if (!schema.required?.includes(field)) errors.push(`${path} must require ${field}`)
      }
    } catch (error) {
      errors.push(`${path} is invalid: ${error.message}`)
    }
  }

  errors.push(...validateUxUiWorkflow(await readText('workflows/feature-delivery.yaml')))
  return { allowed: errors.length === 0, errors }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await validateUxUiGovernance()
  const passed = printResult('ux-ui-guard', result.errors)
  if (!passed || !result.allowed) process.exitCode = 1
}
