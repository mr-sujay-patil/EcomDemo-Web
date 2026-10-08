import { appApi } from '@/api/client'
import type { components } from '@/api/generated/app'

export type DeadLetter = components['schemas']['DeadLetterView']
export type Replay = components['schemas']['ReplayView']

/** GET /api/admin/dead-letters: at most 500 records, read from the start of each saga dead-letter topic every time. */
export async function fetchDeadLetters(signal?: AbortSignal): Promise<DeadLetter[]> {
  const { data } = await appApi.GET('/api/admin/dead-letters', { signal })
  return data ?? []
}

/** GET /api/admin/dead-letters/replays: the audit log, newest first (the latest 200). */
export async function fetchReplays(signal?: AbortSignal): Promise<Replay[]> {
  const { data } = await appApi.GET('/api/admin/dead-letters/replays', { signal })
  return data ?? []
}

/** POST …/{topic}/{partition}/{offset}/replay: sends the record back to the topic it failed on. 409: already replayed (backend KI-040). */
export async function replayDeadLetter(letter: DeadLetter, signal?: AbortSignal): Promise<Replay> {
  const { data } = await appApi.POST('/api/admin/dead-letters/{topic}/{partition}/{offset}/replay', {
    params: { path: { topic: letter.topic, partition: letter.partition, offset: letter.offset } },
    signal,
  })
  if (!data) throw new Error('The server answered without a replay.')
  return data
}
