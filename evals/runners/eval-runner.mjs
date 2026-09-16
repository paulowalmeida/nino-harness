import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'
import { evaluateAssertion } from '../assertions.mjs'
import { harnessRoot } from '../../hooks/utils.mjs'

const scenariosDirectory = join(harnessRoot, 'evals', 'scenarios')

export async function loadScenarios() {
  const entries = await readdir(scenariosDirectory, { withFileTypes: true })
  const scenarios = []
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    const document = JSON.parse(await readFile(join(scenariosDirectory, entry.name), 'utf8'))
    scenarios.push(...(Array.isArray(document) ? document : [document]))
  }
  return scenarios.sort((left, right) => left.id.localeCompare(right.id))
}

function numericComparison(current, baseline) {
  const comparison = {}
  for (const [key, value] of Object.entries(current)) {
    if (typeof value !== 'number' || typeof baseline?.[key] !== 'number') continue
    comparison[key] = { baseline: baseline[key], candidate: value, delta: Number((value - baseline[key]).toFixed(4)) }
  }
  return comparison
}

function calculateMetrics(results) {
  const count = (predicate) => results.filter(predicate).length
  const passed = count((result) => result.result === 'pass')
  const happy = results.filter((result) => result.class === 'happy-path')
  const adversarial = results.filter((result) => result.class === 'adversarial')
  const violations = results.filter((result) => result.class !== 'happy-path')
  return {
    scenarioCount: results.length,
    passed: passed,
    failed: results.length - passed,
    scenarioPassRate: results.length ? passed / results.length : 0,
    detectionRate: violations.length ? count((result) => result.class !== 'happy-path' && result.result === 'pass') / violations.length : null,
    bypassRate: adversarial.length ? count((result) => result.class === 'adversarial' && result.result === 'fail') / adversarial.length : null,
    falsePositiveRate: happy.length ? count((result) => result.class === 'happy-path' && result.result === 'fail') / happy.length : null,
    unsupportedSuccessRate: null,
    humanInterventionRate: null,
    selfCorrectionRate: null,
    notMeasured: ['unsupportedSuccessRate', 'humanInterventionRate', 'selfCorrectionRate'],
  }
}

export async function runEvaluations({ outputDir, baselinePath, failOnRegression = false } = {}) {
  const startedAt = new Date().toISOString()
  const runId = process.env.GITHUB_RUN_ID ? `github-${process.env.GITHUB_RUN_ID}` : `local-${Date.now()}`
  const scenarios = await loadScenarios()
  const results = []

  for (const scenario of scenarios) {
    const assertions = []
    for (const assertion of scenario.assertions ?? []) {
      const result = await evaluateAssertion(assertion)
      assertions.push({ ...assertion, ...result })
    }
    const passed = assertions.every((assertion) => assertion.pass)
    results.push({
      scenarioId: scenario.id,
      title: scenario.title,
      category: scenario.category,
      class: scenario.class,
      agent: scenario.agent ?? null,
      startedAt,
      rulesLoaded: scenario.rules ?? [],
      skillsInvoked: [],
      hooksTriggered: scenario.hooks ?? [],
      violationsDetected: scenario.expectedViolations ?? [],
      automaticCorrections: [],
      humanInterventions: null,
      verificationEvidence: assertions.map((assertion) => assertion.evidence),
      result: passed ? 'pass' : 'fail',
      assertions,
    })
  }

  const metrics = calculateMetrics(results)
  let comparison = null
  if (baselinePath) {
    const baseline = JSON.parse(await readFile(resolve(baselinePath), 'utf8'))
    comparison = numericComparison(metrics, baseline.metrics ?? baseline)
  }

  const payload = {
    schemaVersion: 1,
    runId,
    startedAt,
    completedAt: new Date().toISOString(),
    evaluationKind: 'deterministic-harness',
    scenarios: results,
    metrics,
    comparison,
  }

  const regressions = Object.entries(comparison ?? {}).filter(([key, value]) =>
    (key === 'scenarioPassRate' && value.candidate < value.baseline) ||
    (key === 'detectionRate' && value.candidate < value.baseline) ||
    (key === 'bypassRate' && value.candidate > value.baseline) ||
    (key === 'falsePositiveRate' && value.candidate > value.baseline),
  )
  payload.regressions = regressions.map(([metric, value]) => ({ metric, ...value }))

  if (outputDir) {
    await mkdir(outputDir, { recursive: true })
    await writeFile(join(outputDir, 'run.json'), `${JSON.stringify(payload, null, 2)}\n`)
    await writeFile(join(outputDir, 'summary.md'), renderSummary(payload))
  }

  return { payload, exitCode: failOnRegression && regressions.length ? 1 : payload.metrics.failed ? 1 : 0 }
}

function renderSummary(payload) {
  const { metrics } = payload
  return `# Nino Harness Evaluation\n\n- Run: ${payload.runId}\n- Kind: ${payload.evaluationKind}\n- Scenarios: ${metrics.scenarioCount}\n- Passed: ${metrics.passed}\n- Failed: ${metrics.failed}\n- Detection rate: ${formatMetric(metrics.detectionRate)}\n- Bypass rate: ${formatMetric(metrics.bypassRate)}\n- False-positive rate: ${formatMetric(metrics.falsePositiveRate)}\n- Unsupported success rate: not measured\n- Human intervention rate: not measured\n- Self-correction rate: not measured\n\n## Scenario results\n\n${payload.scenarios.map((scenario) => `- ${scenario.result.toUpperCase()}: ${scenario.scenarioId} — ${scenario.title}`).join('\n')}\n`
}

function formatMetric(value) {
  return value === null ? 'not measured' : `${Math.round(value * 100)}%`
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const outputIndex = args.indexOf('--output-dir')
  const baselineIndex = args.indexOf('--baseline')
  const outputDir = outputIndex >= 0 ? args[outputIndex + 1] : process.env.EVAL_OUTPUT_DIR ?? `/tmp/nino-harness-evals/${Date.now()}`
  const baselinePath = baselineIndex >= 0 ? args[baselineIndex + 1] : process.env.EVAL_BASELINE
  const failOnRegression = args.includes('--fail-on-regression')
  const { payload, exitCode } = await runEvaluations({ outputDir, baselinePath, failOnRegression })
  console.log(renderSummary(payload))
  console.log(`Artifact: ${outputDir}`)
  process.exitCode = exitCode
}
