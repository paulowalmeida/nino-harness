const defaultDebugUrl = process.env.NINO_BROWSER_DEBUG_URL ?? 'http://127.0.0.1:9223'
const allowedOrigins = new Set(
  (process.env.NINO_BROWSER_ALLOWED_ORIGINS ?? 'http://localhost,http://127.0.0.1')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
)

function assertAllowedUrl(url) {
  const parsed = new URL(url)
  if (!allowedOrigins.has(parsed.origin)) throw new Error(`Browser origin is not allowed: ${parsed.origin}`)
}

async function tabs() {
  const response = await fetch(`${defaultDebugUrl}/json`)
  if (!response.ok) throw new Error(`Browser debug endpoint returned ${response.status}`)
  return response.json()
}

function allowedTabs(allTabs) {
  return allTabs.filter((tab) => {
    try {
      assertAllowedUrl(tab.url)
      return true
    } catch {
      return false
    }
  })
}

async function tabTarget(tabId) {
  const target = (await tabs()).find((tab) => tab.id === tabId || tab.url === tabId)
  if (!target?.webSocketDebuggerUrl) throw new Error(`Browser tab not found: ${tabId}`)
  return target
}

async function cdp(tabId, method, params = {}) {
  const target = await tabTarget(tabId)
  return new Promise((resolveResult, reject) => {
    const socket = new WebSocket(target.webSocketDebuggerUrl)
    const id = Date.now()
    const timeout = setTimeout(() => {
      socket.close()
      reject(new Error(`Browser command timed out: ${method}`))
    }, 15000)
    socket.addEventListener('open', () => socket.send(JSON.stringify({ id, method, params })))
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.id !== id) return
      clearTimeout(timeout)
      socket.close()
      if (message.error) reject(new Error(message.error.message))
      else resolveResult(message.result)
    })
    socket.addEventListener('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
  })
}

function browserTool({ name, description, execute }) {
  return { name, description, agentId: '*', action: 'browser-checks', skill: '*', repository: 'nino-app', execute }
}

export function createBrowserTools() {
  return [
    browserTool({
      name: 'browser_list_tabs',
      description: 'List available browser tabs connected to the local debug endpoint.',
      execute: async () => JSON.stringify(allowedTabs(await tabs()).map(({ id, title, url, type }) => ({ id, title, url, type }))),
    }),
    browserTool({
      name: 'browser_wait_for_text',
      description: 'Wait until visible text appears in a safe browser tab.',
      execute: async ({ tabId, text, timeoutMs = 15000 }) => {
        const deadline = Date.now() + Math.min(Number(timeoutMs), 30000)
        while (Date.now() < deadline) {
          const target = await tabTarget(tabId)
          assertAllowedUrl(target.url)
          const result = await cdp(tabId, 'Runtime.evaluate', {
            expression: 'document.body?.innerText?.includes(' + JSON.stringify(text) + ') ?? false',
            returnByValue: true,
          })
          if (result.result?.value === true) return JSON.stringify({ found: true, text })
          await new Promise((resolveWait) => setTimeout(resolveWait, 250))
        }
        throw new Error('Timed out waiting for visible text: ' + text)
      },
    }),
    browserTool({
      name: 'browser_navigate',
      description: 'Navigate an existing browser tab to a URL in the configured safe environment.',
      execute: async ({ tabId, url }) => {
        if (!/^https?:\/\//i.test(url)) throw new Error('Browser navigation requires an http(s) URL')
        assertAllowedUrl(url)
        await cdp(tabId, 'Page.navigate', { url })
        return JSON.stringify({ tabId, url })
      },
    }),
    browserTool({
      name: 'browser_snapshot',
      description: 'Read the user-visible URL, title, and text content of a browser tab.',
      execute: async ({ tabId }) => {
        const target = await tabTarget(tabId)
        assertAllowedUrl(target.url)
        const result = await cdp(tabId, 'Runtime.evaluate', {
          expression: 'JSON.stringify({url: location.href, title: document.title, text: document.body?.innerText ?? ""})',
          returnByValue: true,
        })
        return result.result?.value ?? '{}'
      },
    }),
    browserTool({
      name: 'browser_click',
      description: 'Click one user-visible element by CSS selector in a safe browser tab.',
      execute: async ({ tabId, selector }) => {
        const target = await tabTarget(tabId)
        assertAllowedUrl(target.url)
        const expression = `(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) throw new Error('Element not found'); element.click(); return { clicked: true, selector: ${JSON.stringify(selector)} }; })()`
        const result = await cdp(tabId, 'Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
        return JSON.stringify(result.result?.value ?? { clicked: true })
      },
    }),
    browserTool({
      name: 'browser_fill',
      description: 'Fill one user-visible input by CSS selector with test data in a safe browser tab.',
      execute: async ({ tabId, selector, value }) => {
        const target = await tabTarget(tabId)
        assertAllowedUrl(target.url)
        const expression = `(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) throw new Error('Element not found'); element.focus(); element.value = ${JSON.stringify(value)}; element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })); return { filled: true, selector: ${JSON.stringify(selector)} }; })()`
        const result = await cdp(tabId, 'Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
        return JSON.stringify(result.result?.value ?? { filled: true })
      },
    }),
  ]
}
