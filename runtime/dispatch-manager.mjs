import { randomUUID } from 'node:crypto'

const statuses = new Set(['READY', 'IN-PROGRESS', 'BLOCKED', 'DONE'])

export class DispatchManager {
  constructor({ state, stateStore, telemetry }) {
    this.state = state
    this.stateStore = stateStore
    this.telemetry = telemetry
  }

  async issue({ stage, task, targetAgent, scope, dependsOn = [], acceptanceCriteria, requiredOutput }) {
    if (!targetAgent || targetAgent === 'tech-lead') throw new Error('Dispatch target must be a specialist')
    if (!Array.isArray(scope) || scope.length === 0) throw new Error('Dispatch scope is required')
    if (!Array.isArray(acceptanceCriteria) || acceptanceCriteria.length === 0) {
      throw new Error('Dispatch acceptance criteria are required')
    }

    const dispatch = {
      id: `dispatch-${randomUUID()}`,
      taskId: task,
      sourceAgent: 'tech-lead',
      targetAgent,
      workOrder: stage,
      scope,
      dependsOn,
      acceptanceCriteria,
      requiredOutput,
      status: 'READY',
    }
    if (!statuses.has(dispatch.status)) throw new Error('Invalid dispatch status')
    this.state.dispatches.push(dispatch)
    await this.telemetry.event({ type: 'dispatch-issued', dispatchId: dispatch.id, targetAgent })
    return dispatch
  }

  async update(dispatch, status) {
    if (!statuses.has(status)) throw new Error(`Invalid dispatch status: ${status}`)
    dispatch.status = status
    await this.stateStore.save(this.state)
  }
}
