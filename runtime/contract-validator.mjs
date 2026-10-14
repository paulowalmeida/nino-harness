import Ajv from 'ajv/dist/2020.js'

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  formats: { 'date-time': true },
})

const defaultStageOutputSchema = {
  type: 'object',
  additionalProperties: true,
  required: ['status'],
  properties: { status: { type: 'string', minLength: 1 } },
}

function fencedJson(text) {
  return text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? null
}

/** First balanced `{...}` object in `text`, ignoring braces inside string literals. */
function balancedJsonObject(text) {
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < text.length; index += 1) {
    const char = text[index]
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') inString = true
    else if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) return text.slice(start, index + 1)
    }
  }
  return null
}

/**
 * Parses an object out of an agent's raw text answer. Agents are told to
 * return only JSON, but a model turn can still wrap it in prose or a fenced
 * code block; this tries the whole trimmed answer, then a fenced block, then
 * the first balanced `{...}` found anywhere in the text.
 */
export function extractJsonObject(output) {
  const trimmed = output.trim()
  for (const candidate of [trimmed, fencedJson(trimmed), balancedJsonObject(trimmed)]) {
    if (!candidate) continue
    try {
      const value = JSON.parse(candidate)
      if (value && typeof value === 'object' && !Array.isArray(value)) return value
    } catch {
      // try the next candidate
    }
  }
  return null
}

export function validateContractOutput(output, schema, contractName) {
  const value = extractJsonObject(output)
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { valid: false, errors: [`${contractName} output must be a JSON object`] }
  }
  const validate = ajv.compile(schema ?? defaultStageOutputSchema)
  if (validate(value)) return { valid: true, value }
  return {
    valid: false,
    errors: (validate.errors ?? []).map((error) => `${contractName}${error.instancePath || '$'} ${error.message}`),
  }
}
