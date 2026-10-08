import { Component, type ReactNode } from 'react'
import { RootErrorPage } from './ErrorPages'

/**
 * The last net, around the providers and the router: a render error there is outside every route boundary. React has no hook
 * for this; an error boundary has to be a class. (Boundaries do not catch errors in event handlers, in async code, or in
 * the boundary itself: those are the unhandled-rejection handler's job, or the caller's.)
 */
export class RootErrorBoundary extends Component<{ children: ReactNode }, { error: unknown; failed: boolean }> {
  override state = { error: null as unknown, failed: false }

  static getDerivedStateFromError(error: unknown) {
    return { error, failed: true }
  }

  override render() {
    return this.state.failed ? <RootErrorPage error={this.state.error} /> : this.props.children
  }
}
