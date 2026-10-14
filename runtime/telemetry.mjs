export class RunTelemetry {
  constructor(state, stateStore) {
    this.state = state
    this.stateStore = stateStore
  }

  async event(event) {
    this.state.events.push({ timestamp: new Date().toISOString(), ...event })
    this.state.updatedAt = new Date().toISOString()
    await this.stateStore.save(this.state)
  }

  startSpan(name, attributes = {}) {
    const startedAt = Date.now()
    return async (result = {}) => {
      await this.event({
        type: 'span',
        name,
        durationMs: Date.now() - startedAt,
        ...attributes,
        ...result,
      })
    }
  }
}
