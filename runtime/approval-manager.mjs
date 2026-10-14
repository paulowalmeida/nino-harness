import { randomUUID } from 'node:crypto'

export class ApprovalRequiredError extends Error {
  constructor(point) {
    super(`Human approval required: ${point}`)
    this.name = 'ApprovalRequiredError'
    this.point = point
  }
}

export class ApprovalManager {
  constructor({ state, stateStore, approvedPoints = [] }) {
    this.state = state
    this.stateStore = stateStore
    this.approvedPoints = new Set(approvedPoints)
  }

  async require(point, stage) {
    const existing = this.state.approvals.find((approval) => approval.point === point)
    if (existing?.status === 'APPROVED' || this.approvedPoints.has(point)) return
    if (!existing) {
      this.state.approvals.push({
        id: `approval-${randomUUID()}`,
        point,
        stage,
        status: 'PENDING',
        requestedAt: new Date().toISOString(),
      })
      await this.stateStore.save(this.state)
    }
    throw new ApprovalRequiredError(point)
  }

  async approve(point, reviewer = 'human') {
    const approval = this.state.approvals.find((candidate) => candidate.point === point)
    if (!approval) throw new Error(`Unknown approval point: ${point}`)
    approval.status = 'APPROVED'
    approval.reviewer = reviewer
    approval.approvedAt = new Date().toISOString()
    await this.stateStore.save(this.state)
    return approval
  }

  async reject(point, reason, reviewer = 'human') {
    const approval = this.state.approvals.find((candidate) => candidate.point === point)
    if (!approval) throw new Error(`Unknown approval point: ${point}`)
    approval.status = 'REJECTED'
    approval.reviewer = reviewer
    approval.reason = reason
    approval.rejectedAt = new Date().toISOString()
    await this.stateStore.save(this.state)
    return approval
  }
}
