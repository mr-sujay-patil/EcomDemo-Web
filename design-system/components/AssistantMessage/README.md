# AssistantMessage

One message in the shopping assistant's chat, with an optional cart proposal.

## Use
- The assistant PROPOSES; the customer confirms. A proposal always has Add and Not now, and nothing lands in the cart until Add.
- The assistant's messages sit on a card with a small "Shop assistant" label; the customer's own are `surface-alt`, right-aligned. No sparkles, no glow, no gradient: it looks like the rest of the shop.
- `sources` says what it checked (product search, store policies, your orders), so answers are traceable.
- It writes like a person behind the counter: short, specific, a little informal. It never says "Great question!" or "I'd be happy to help".
