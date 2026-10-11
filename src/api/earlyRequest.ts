// Stub (fix KI-027 fills it in): the client never takes the early request, so it asks the network again.
export type EarlyRequest = {
  path: string
  correlationId: string | null
  response: Promise<Response>
  taken?: boolean
}

export function takeEarlyResponse(request: Request): Promise<Response> | null {
  void request
  return null
}
