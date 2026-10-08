import { useState } from 'react'
import { usePageTitle } from '@/app/pageTitle'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { ErrorPanel } from '@/components/ErrorPanel'
import { StatusBadge } from '@/components/StatusBadge'
import { useDeadLetters, useReplay, useReplays } from './api'
import { ConfirmDialog } from './ConfirmDialog'
import { failureOf } from './failure'
import type { DeadLetter } from './saga'

const when = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'medium' })
const time = (iso: string) => (Number.isNaN(Date.parse(iso)) ? iso : when.format(new Date(iso)))

/** Operations support for the order saga: records that failed, sent back once by an admin, and the log of who did it. */
export function SagaPage() {
  usePageTitle('Dead letters')
  const letters = useDeadLetters()
  const replays = useReplays()
  const replay = useReplay()
  const [target, setTarget] = useState<DeadLetter | null>(null)
  const [outcome, setOutcome] = useState<{
    tone: 'success' | 'danger'
    message: string
    reference?: string | null
  } | null>(null)

  async function confirm() {
    // Only the open dialog can confirm, and it opens with a record.
    const letter = target!
    setTarget(null)
    try {
      await replay.mutateAsync(letter)
      setOutcome({
        tone: 'success',
        message: `Sent the record at offset ${letter.offset} back to ${letter.originalTopic}.`,
      })
    } catch (error) {
      setOutcome({ tone: 'danger', ...failureOf(error, 'The record was not replayed.') })
    }
  }

  return (
    <div className="stack">
      <h1>Dead letters</h1>
      <p>
        These are records the order saga could not handle. Replaying sends one back to the topic it failed on, once.
        This is an operations tool: look at the reason before you replay.
      </p>
      {outcome ? (
        <Alert
          tone={outcome.tone}
          title={outcome.message}
          onClose={() => {
            setOutcome(null)
          }}
        >
          {outcome.reference ? <code>{outcome.reference}</code> : null}
        </Alert>
      ) : null}
      {letters.isError ? <ErrorPanel error={letters.error} onRetry={() => void letters.refetch()} /> : null}
      {letters.isPending ? <p role="status">Loading the dead letters…</p> : null}
      {letters.data?.length === 0 ? <p>There are no dead letters.</p> : null}
      {letters.data && letters.data.length > 0 ? (
        <div className="admin-scroll">
          <table className="admin-table">
            <caption className="visually-hidden">Dead letters</caption>
            <thead>
              <tr>
                <th scope="col">Topic</th>
                <th scope="col">Where</th>
                <th scope="col">Failed with</th>
                <th scope="col">State</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {letters.data.map((letter) => (
                <tr key={`${letter.topic}/${letter.partition}/${letter.offset}`}>
                  <th scope="row">
                    {letter.originalTopic}
                    <div className="ed-caption">{time(letter.timestamp)}</div>
                  </th>
                  <td className="admin-mono">
                    {letter.partition}:{letter.offset}
                  </td>
                  <td>
                    <div>{letter.exceptionClass}</div>
                    <div className="ed-caption">{letter.exceptionMessage}</div>
                    <details>
                      <summary>Payload</summary>
                      <pre className="admin-payload">{letter.payload}</pre>
                    </details>
                  </td>
                  <td>
                    {letter.replayed ? (
                      <StatusBadge tone="success">Replayed</StatusBadge>
                    ) : (
                      <StatusBadge tone="accent">Waiting</StatusBadge>
                    )}
                  </td>
                  <td className="admin-actions">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={letter.replayed}
                      aria-label={`Replay offset ${letter.offset} from ${letter.originalTopic}`}
                      onClick={() => {
                        setTarget(letter)
                      }}
                    >
                      Replay
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <h2>Replay log</h2>
      {replays.isError ? <ErrorPanel error={replays.error} onRetry={() => void replays.refetch()} /> : null}
      {replays.data?.length === 0 ? <p>Nothing has been replayed.</p> : null}
      {replays.data && replays.data.length > 0 ? (
        <div className="admin-scroll">
          <table className="admin-table">
            <caption className="visually-hidden">Replay log</caption>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Who</th>
                <th scope="col">Record</th>
                <th scope="col">Sent to</th>
              </tr>
            </thead>
            <tbody>
              {replays.data.map((entry) => (
                <tr key={`${entry.dltTopic}/${entry.dltPartition}/${entry.dltOffset}/${entry.replayedAt}`}>
                  <td>{time(entry.replayedAt)}</td>
                  <td>{entry.replayedBy}</td>
                  <td className="admin-mono">
                    {entry.dltPartition}:{entry.dltOffset}
                  </td>
                  <td>{entry.originalTopic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <ConfirmDialog
        open={target !== null}
        title="Replay this record?"
        confirmLabel="Replay"
        pending={replay.isPending}
        onConfirm={() => void confirm()}
        onClose={() => {
          setTarget(null)
        }}
      >
        <p>
          This sends the record back to <strong>{target?.originalTopic}</strong>, byte for byte, and writes your name in
          the replay log. A record can be replayed once.
        </p>
      </ConfirmDialog>
    </div>
  )
}
