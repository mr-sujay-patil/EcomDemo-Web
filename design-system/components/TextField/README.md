# TextField

A labelled text input with an optional hint or error below.

## Use
- Always pass `label`, except in the header search, which passes `aria-label`.
- `hint` explains what the field is for; `error` replaces it and says how to fix it ("A PIN code has 6 digits"), never just "Invalid".
- The border is `border-strong` (3:1 or more); focus adds a `brand` ring.
- Every other input attribute (`type`, `name`, `autoComplete`, `onChange`) passes through.
