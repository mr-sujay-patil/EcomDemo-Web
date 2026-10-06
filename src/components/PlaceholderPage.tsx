/** A route that exists now so links and tests work; the phase named here builds the real page. */
export function PlaceholderPage({ title, phase }: { title: string; phase: number }) {
  return (
    <div className="stack">
      <h1>{title}</h1>
      <p className="ed-caption">This page is built in Phase {phase}.</p>
    </div>
  )
}
