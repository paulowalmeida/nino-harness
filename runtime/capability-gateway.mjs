import { authorizeCapability } from '../hooks/capability-guard.mjs'
import { validatePreflight } from '../hooks/orchestration-preflight.mjs'
import { findAgent } from './loaders.mjs'

const technicalActions = new Set([
  'technical-read',
  'technical-inspection',
  'host-technical-inspection',
  'specialist-technical-inspection',
  'implementation',
  'test',
  'deployment',
])

export class CapabilityGateway {
  constructor({ configuration, state, telemetry, tools = new Map() }) {
    this.configuration = configuration
    this.state = state
    this.telemetry = telemetry
    this.tools = tools
  }

  authorize({ agentId, action, skill, repository, actor = 'specialist', preflightAction }) {
    const agent = findAgent(this.configuration, agentId)
    const capability = authorizeCapability({
      agentId,
      role: agent.role,
      action,
      skill,
      repository,
      agents: this.configuration.agents,
    })
    if (!capability.allowed) {
      throw new Error(`Capability blocked: ${capability.errors.join('; ')}`)
    }

    const requiredPreflightAction = preflightAction ?? (technicalActions.has(action) ? action : undefined)
    if (requiredPreflightAction) {
      const preflight = validatePreflight({ state: this.state, actor, action: requiredPreflightAction })
      if (preflight.blocked) {
        throw new Error(`Orchestration preflight blocked: ${preflight.errors.join('; ')}`)
      }
    }

    return capability
  }

  registerTool({ name, agentId, action, skill, repository, execute }) {
    if (this.tools.has(name)) throw new Error(`Tool already registered: ${name}`)
    this.tools.set(name, { name, agentId, action, skill, repository, execute })
  }

  definitionsFor(agentId) {
    const agent = findAgent(this.configuration, agentId)
    return [...this.tools.values()]
      .filter((tool) => tool.agentId === agentId || tool.agentId === '*')
      .filter((tool) => agentId !== 'product-owner' || tool.action === 'browser-checks')
      .map((tool) => tool.agentId === '*'
        ? { ...tool, agentId, skill: tool.skill === '*' ? agent.skills[0] : tool.skill }
        : tool)
  }

  async executeTool(name, input, { agentId } = {}) {
    const tool = this.tools.get(name)
    if (!tool) throw new Error(`Unknown tool: ${name}`)
    const effectiveAgentId = tool.agentId === '*' ? agentId : tool.agentId
    if (!effectiveAgentId) throw new Error(`Tool ${name} requires a bound agent identity`)
    const agent = findAgent(this.configuration, effectiveAgentId)
    const repository = input?.repository ?? tool.repository
    if (!repository || repository === '*') throw new Error(`Tool ${name} requires a repository`)
    this.authorize({
      ...tool,
      agentId: effectiveAgentId,
      skill: tool.skill === '*' ? agent.skills[0] : tool.skill,
      repository,
      actor: effectiveAgentId === 'product-owner' ? 'product-owner' : 'specialist',
      preflightAction: effectiveAgentId === 'product-owner' ? undefined : 'specialist-technical-inspection',
    })
    const endSpan = this.telemetry.startSpan('tool', { tool: name, agentId: effectiveAgentId, action: tool.action })
    try {
      const output = await tool.execute(input)
      await endSpan({ status: 'DONE' })
      return output
    } catch (error) {
      await endSpan({ status: 'FAILED', error: error.message })
      throw error
    }
  }
}
