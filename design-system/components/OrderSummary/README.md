# OrderSummary

The cart's totals panel and the Place order action.

## Use
- Sits to the right of the cart lines on desktop and below them on mobile.
- Free shipping reads "Free" in `success`; a discount is a separate row, never folded into the subtotal.
- While the order request is in flight pass `loading`; then show the `SagaTimeline` for the new order.
- The note under the button sets expectations for the saga: the order is PENDING until stock and payment are done.
