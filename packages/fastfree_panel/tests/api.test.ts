import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  DEFAULT_TIMEOUT_MS,
  PanelApiError,
  apiRequest,
  apiHealth,
  apiMachines,
  apiBuildMachine,
  apiGlobalShow,
  apiPaseoStatus,
  apiPaseoPrompt,
  apiOmnigentStatus,
  apiOmnigentSessions,
  apiOmnigentDispatch,
  apiPendingApprovals,
  apiDecideApproval,
  apiCostSummary,
  apiHindsightQuery,
  apiStudioHealth,
  apiStudioOmnigentStatus,
  apiStudioDispatch,
  apiStudioTasks,
  apiStudioTask,
  apiStudioCancel,
  apiStudioDiscard,
} from '../src/lib/api'

/**
 * The client is a thin wrapper around `fetch`, so the whole module is
 * exercised by stubbing the global and inspecting the request it builds.
 */
const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

/** A minimal `Response`-shaped object — the client only reads `ok`/`status`/`text`. */
function reply(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response
}

function lastRequest(): { url: string; init: RequestInit } {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit]
  return { url, init }
}

describe('panel api client', () => {
  it('exposes a default request budget', () => {
    expect(DEFAULT_TIMEOUT_MS).toBe(15_000)
  })

  it('builds a typed PanelApiError', () => {
    const err = new PanelApiError('NETWORK', 0, 'connection refused')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('PanelApiError')
    expect(err.code).toBe('NETWORK')
    expect(err.status).toBe(0)
    expect(err.message).toBe('connection refused')
  })

  it('keeps instanceof working after transpilation', () => {
    const err = new PanelApiError('UNKNOWN', 500, 'boom')
    expect(err instanceof PanelApiError).toBe(true)
  })

  it('preserves the cause when one is supplied', () => {
    const cause = new TypeError('fetch failed')
    const err = new PanelApiError('NETWORK', 0, 'offline', { cause })
    expect(err.cause).toBe(cause)
  })
})

describe('apiRequest — success envelope', () => {
  it('unwraps { data } and returns the payload', async () => {
    fetchMock.mockResolvedValueOnce(reply({ data: { status: 'ok' } }))
    await expect(apiRequest('/health')).resolves.toEqual({ status: 'ok' })
  })

  it('targets the versioned API base with an Accept header', async () => {
    fetchMock.mockResolvedValueOnce(reply({ data: 1 }))
    await apiRequest('/things')
    const { url, init } = lastRequest()
    expect(url).toBe('/api/v1/things')
    expect((init.headers as Record<string, string>).Accept).toBe('application/json')
  })

  it('defaults to GET and sends a null body', async () => {
    fetchMock.mockResolvedValueOnce(reply({ data: null }))
    await apiRequest('/things')
    const { init } = lastRequest()
    expect(init.method).toBe('GET')
    expect(init.body).toBeNull()
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined()
  })

  it('serialises a body and announces it', async () => {
    fetchMock.mockResolvedValueOnce(reply({ data: null }))
    await apiRequest('/things', { method: 'POST', body: { a: 1 } })
    const { init } = lastRequest()
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ a: 1 }))
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('returns null data untouched', async () => {
    fetchMock.mockResolvedValueOnce(reply({ data: null }))
    await expect(apiRequest('/none')).resolves.toBeNull()
  })
})

describe('apiRequest — error envelope', () => {
  it('throws the backend code and message', async () => {
    fetchMock.mockResolvedValueOnce(
      reply({ error: { code: 'VALIDATION_ERROR', message: 'bad input' } }, 400),
    )
    await expect(apiRequest('/x')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 400,
      message: 'bad input',
    })
  })

  it('maps an unknown backend code to UNKNOWN', async () => {
    fetchMock.mockResolvedValueOnce(reply({ error: { code: 'SOMETHING_NEW', message: 'x' } }, 400))
    await expect(apiRequest('/x')).rejects.toMatchObject({ code: 'UNKNOWN', status: 400 })
  })

  it('falls back to the status-derived code when the envelope is malformed', async () => {
    // error is not a record
    fetchMock.mockResolvedValueOnce(reply({ error: 'nope' }, 401))
    await expect(apiRequest('/x')).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 })
  })

  it('falls back when code/message are not strings', async () => {
    fetchMock.mockResolvedValueOnce(reply({ error: { code: 42, message: 7 } }, 403))
    await expect(apiRequest('/x')).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 })
  })

  it('falls back when the body is not a record', async () => {
    fetchMock.mockResolvedValueOnce(reply([1, 2, 3], 404))
    await expect(apiRequest('/x')).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 })
  })

  it('falls back when the body is not JSON at all', async () => {
    fetchMock.mockResolvedValueOnce(reply('<html>oops</html>', 502))
    await expect(apiRequest('/x')).rejects.toMatchObject({ code: 'UPSTREAM_ERROR', status: 502 })
  })

  it('falls back when the body is empty', async () => {
    fetchMock.mockResolvedValueOnce(reply('', 503))
    await expect(apiRequest('/x')).rejects.toMatchObject({ code: 'UPSTREAM_ERROR', status: 503 })
  })
})

describe('apiRequest — status-derived codes', () => {
  const cases: Array<[number, string]> = [
    [400, 'VALIDATION_ERROR'],
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [408, 'TIMEOUT'],
    [429, 'RATE_LIMITED'],
    [502, 'UPSTREAM_ERROR'],
    [503, 'UPSTREAM_ERROR'],
    [504, 'UPSTREAM_ERROR'],
    [500, 'INTERNAL'],
    [507, 'INTERNAL'],
    [418, 'UNKNOWN'],
  ]

  for (const [status, code] of cases) {
    it(`maps HTTP ${status} to ${code}`, async () => {
      fetchMock.mockResolvedValueOnce(reply(null, status))
      await expect(apiRequest('/x')).rejects.toMatchObject({ code, status })
    })
  }
})

describe('apiRequest — success-shape failures', () => {
  it('rejects a 2xx body without a data key', async () => {
    fetchMock.mockResolvedValueOnce(reply({ not: 'data' }, 200))
    await expect(apiRequest('/x')).rejects.toMatchObject({ code: 'INTERNAL', status: 200 })
  })

  it('rejects a 2xx non-JSON body', async () => {
    fetchMock.mockResolvedValueOnce(reply('hello', 200))
    await expect(apiRequest('/x')).rejects.toMatchObject({ code: 'INTERNAL', status: 200 })
  })

  it('rejects an empty 2xx body', async () => {
    fetchMock.mockResolvedValueOnce(reply('', 200))
    await expect(apiRequest('/x')).rejects.toMatchObject({ code: 'INTERNAL', status: 200 })
  })
})

describe('apiRequest — transport failures', () => {
  it('maps a network failure to NETWORK with the cause attached', async () => {
    const cause = new TypeError('fetch failed')
    fetchMock.mockRejectedValueOnce(cause)
    try {
      await apiRequest('/x')
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(PanelApiError)
      expect((error as PanelApiError).code).toBe('NETWORK')
      expect((error as PanelApiError).status).toBe(0)
      expect((error as PanelApiError).cause).toBe(cause)
    }
  })

  it('maps an abort to TIMEOUT', async () => {
    fetchMock.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'))
    await expect(apiRequest('/x')).rejects.toMatchObject({ code: 'TIMEOUT', status: 0 })
  })

  it('times out through the AbortController signal', async () => {
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    )
    await expect(apiRequest('/x', { timeoutMs: 20 })).rejects.toMatchObject({
      code: 'TIMEOUT',
      status: 0,
    })
  }, 10_000)

  it('clears the timeout timer after a successful call', async () => {
    vi.useFakeTimers()
    try {
      fetchMock.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve(reply({ data: 1 })), 5)),
      )
      const pending = apiRequest('/x', { timeoutMs: 1_000 })
      await vi.advanceTimersByTimeAsync(10)
      await expect(pending).resolves.toBe(1)
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('panel endpoint helpers', () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue(reply({ data: { ok: true } }))
  })

  it('apiHealth calls /health', async () => {
    await apiHealth()
    expect(lastRequest().url).toBe('/api/v1/health')
  })

  it('apiHealth forwards a custom timeout', async () => {
    await apiHealth(5)
    expect(lastRequest().init.signal).toBeDefined()
  })

  it('apiMachines calls /machines', async () => {
    await apiMachines()
    expect(lastRequest().url).toBe('/api/v1/machines')
  })

  it('apiBuildMachine POSTs to the encoded machine name', async () => {
    await apiBuildMachine('my machine', { dryRun: true })
    const { url, init } = lastRequest()
    expect(url).toBe('/api/v1/machines/my%20machine/build')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ dryRun: true })
  })

  it('apiBuildMachine omits the timeout when none is given', async () => {
    await apiBuildMachine('box')
    expect(JSON.parse(String(lastRequest().init.body))).toEqual({})
  })

  it('apiGlobalShow calls /global/show', async () => {
    await apiGlobalShow()
    expect(lastRequest().url).toBe('/api/v1/global/show')
  })

  it('apiPaseoStatus calls /paseo/status', async () => {
    await apiPaseoStatus()
    expect(lastRequest().url).toBe('/api/v1/paseo/status')
  })

  it('apiPaseoPrompt POSTs the target and text', async () => {
    await apiPaseoPrompt('agent-1', 'hello')
    const { url, init } = lastRequest()
    expect(url).toBe('/api/v1/paseo/prompt')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ target: 'agent-1', text: 'hello' })
  })

  it('apiOmnigentStatus calls /omnigent/status', async () => {
    await apiOmnigentStatus()
    expect(lastRequest().url).toBe('/api/v1/omnigent/status')
  })

  it('apiOmnigentSessions calls /omnigent/sessions', async () => {
    await apiOmnigentSessions()
    expect(lastRequest().url).toBe('/api/v1/omnigent/sessions')
  })

  it('apiOmnigentDispatch POSTs with a default budget cap', async () => {
    await apiOmnigentDispatch('do it')
    const { url, init } = lastRequest()
    expect(url).toBe('/api/v1/omnigent/dispatch')
    expect(JSON.parse(String(init.body))).toEqual({
      prompt: 'do it',
      budgetCapUsd: 10,
      isolatedWorktree: true,
    })
  })

  it('apiOmnigentDispatch accepts a custom budget cap', async () => {
    await apiOmnigentDispatch('do it', 25)
    expect(JSON.parse(String(lastRequest().init.body)).budgetCapUsd).toBe(25)
  })

  it('apiPendingApprovals calls the governance endpoint', async () => {
    await apiPendingApprovals()
    expect(lastRequest().url).toBe('/api/v1/governance/approvals/pending')
  })

  it('apiDecideApproval POSTs the decision with a default actor', async () => {
    await apiDecideApproval('req-1', 'APPROVE')
    const { url, init } = lastRequest()
    expect(url).toBe('/api/v1/governance/approvals/decision')
    expect(JSON.parse(String(init.body))).toEqual({
      requestId: 'req-1',
      decision: 'APPROVE',
      actor: 'FastFree Operator',
      reason: undefined,
    })
  })

  it('apiDecideApproval forwards a reason', async () => {
    await apiDecideApproval('req-1', 'REJECT', 'Reviewer', 'too risky')
    expect(JSON.parse(String(lastRequest().init.body)).reason).toBe('too risky')
  })

  it('apiCostSummary calls the audit endpoint', async () => {
    await apiCostSummary()
    expect(lastRequest().url).toBe('/api/v1/governance/audit/cost-summary')
  })

  it('apiHindsightQuery POSTs with a default bank id', async () => {
    await apiHindsightQuery('remember this')
    const { url, init } = lastRequest()
    expect(url).toBe('/api/v1/omnigent/memory/query')
    expect(JSON.parse(String(init.body))).toEqual({
      query: 'remember this',
      bankId: 'fastfree-core-memory',
    })
  })

  it('apiHindsightQuery accepts a custom bank id', async () => {
    await apiHindsightQuery('q', 'other-bank')
    expect(JSON.parse(String(lastRequest().init.body)).bankId).toBe('other-bank')
  })

  it('apiStudioHealth calls /studio/health', async () => {
    await apiStudioHealth()
    expect(lastRequest().url).toBe('/api/v1/studio/health')
  })

  it('apiStudioOmnigentStatus calls the omnigent status route', async () => {
    await apiStudioOmnigentStatus()
    expect(lastRequest().url).toBe('/api/v1/studio/omnigent/status')
  })

  it('apiStudioDispatch POSTs the input', async () => {
    await apiStudioDispatch({ title: 't', prompt: 'p', target: 'x' })
    const { url, init } = lastRequest()
    expect(url).toBe('/api/v1/studio/tasks')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ title: 't', prompt: 'p', target: 'x' })
  })

  it('apiStudioTasks lists tasks', async () => {
    await apiStudioTasks()
    expect(lastRequest().url).toBe('/api/v1/studio/tasks')
  })

  it('apiStudioTask encodes the id', async () => {
    await apiStudioTask('task/1')
    expect(lastRequest().url).toBe('/api/v1/studio/tasks/task%2F1')
  })

  it('apiStudioCancel POSTs to the cancel route', async () => {
    await apiStudioCancel('task-1')
    const { url, init } = lastRequest()
    expect(url).toBe('/api/v1/studio/tasks/task-1/cancel')
    expect(init.method).toBe('POST')
  })

  it('apiStudioDiscard POSTs to the discard route', async () => {
    await apiStudioDiscard('task-1')
    const { url, init } = lastRequest()
    expect(url).toBe('/api/v1/studio/tasks/task-1/discard')
    expect(init.method).toBe('POST')
  })
})
