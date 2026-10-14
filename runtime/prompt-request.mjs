import { createHash } from 'node:crypto'

const repositorySignals = [
  { repository: 'nino-api', pattern: /nino-api|backend|api|nestjs|prisma|endpoint|persistência|persistencia/i },
  { repository: 'nino-app', pattern: /nino-app|frontend|balc[aã]o|browser|gestor-dev|react|ui|tela|p[aá]gina|page/i },
  { repository: 'nino-docs', pattern: /nino-docs|documenta[cç][aã]o|documentation|docs|docusaurus|manual/i },
]

function taskIdFromPrompt(prompt) {
  const digest = createHash('sha256').update(prompt).digest('hex').slice(0, 10)
  return `prompt-${digest}`
}

export function inferRepositories(prompt) {
  const repositories = repositorySignals
    .filter(({ pattern }) => pattern.test(prompt))
    .map(({ repository }) => repository)

  return repositories.length > 0 ? repositories : ['nino-api', 'nino-app', 'nino-docs']
}

export function requestFromPrompt(prompt, { taskId, repositories } = {}) {
  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new Error('Natural-language prompt must not be empty')
  }

  const normalizedPrompt = prompt.trim()
  return {
    taskId: taskId ?? taskIdFromPrompt(normalizedPrompt),
    objective: normalizedPrompt,
    userPrompt: normalizedPrompt,
    inputMode: 'natural-language',
    repositories: repositories?.length ? repositories : inferRepositories(normalizedPrompt),
    scope: ['Product Owner must refine the scope from the user request'],
    outOfScope: [],
    acceptanceCriteria: [],
    criticalJourneys: [],
    decisionsRequired: [],
  }
}
