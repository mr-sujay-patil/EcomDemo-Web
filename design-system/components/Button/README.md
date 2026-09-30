# Button

Buttons start an action; the label is a verb that says which one.

## Variants
- `primary`: the one action the page exists for (Add to cart, Place order). One per view.
- `secondary`: the useful alternative (Continue shopping), and icon-only toolbar buttons.
- `ghost`: low-emphasis actions in dense places (Sign in, Remove, Not now).
- `danger`: destructive and irreversible (Cancel order). Outlined, never filled.

## States
`loading` swaps the icon for a spinner and disables the button; keep the label and change it to the -ing form ("Placing order"). `disabled` only when the reason is visible nearby (Out of stock).

## The consumer supplies
The label, an `onClick`, and an `aria-label` when there is no label.
