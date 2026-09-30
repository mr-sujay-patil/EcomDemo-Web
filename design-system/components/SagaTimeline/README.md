# SagaTimeline

The order's journey through checkout, one step per service in the saga: placed, stock reserved, payment taken, confirmed.

It turns the backend's distributed transaction into something a customer can follow, drawn like the tick boxes on a packing slip. While PENDING, the current step is turmeric; when CONFIRMED every step is green; when CANCELLED the failed step is red with the reason the order API keeps, and later steps read "Not reached".

## Use
- Show it right after Place order and on the order's page.
- `status` and `reason` come from the order API; `current` / `failedAt` from the saga state.
- Poll or subscribe while PENDING. Don't show a spinner over the whole page.
