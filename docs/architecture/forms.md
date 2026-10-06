# Architecture: forms

How a form is built here: one library for the state, one schema for the rules, one place that turns the backend's answer into words next to the right field. The concepts first, then the parts.

## Client validation is a convenience; the server's is the rule

The browser checks a form so the person hears about a short password without waiting for a round trip. The backend checks again, and its answer is the truth: a rule that drifts (the schema is looser, the backend changed) is caught by the server and shown on the field anyway (`applyServerErrors`). So the schemas **mirror** the backend rules and are allowed to be wrong; the server mapping is not allowed to be missing.

## Parts

| Part | What it is |
|---|---|
| `src/features/<feature>/schemas.ts` | Zod schemas with the backend's rules and the store's words. `z.infer` gives the form's value type from the same schema, so the type and the runtime rule cannot disagree |
| `src/components/forms/Form` | A `<form noValidate>` around `useForm`'s result. Focuses the first invalid field on submit and ignores a second submit while one is running |
| `Field` | A `TextField` bound to the form by name: error from the schema or the server, `aria-invalid` and `aria-describedby` through `TextField`. `revealable` adds a Show/Hide button for passwords |
| `SubmitButton` | The primary button: spinner and disabled while submitting |
| `FormError` | An `Alert` for an error that belongs to no one field (wrong credentials, server down), with the reference for support when it helps |
| `applyServerErrors` | A 400 lists every rejected field in one message (`fullName must not be blank; password must be …`): each part goes on its own field, in the field's label ("Full name must not be blank"), and the top-most gets focus. What names no field, or any other status, comes back for `FormError` |

The form library is React Hook Form with the Zod resolver (`@hookform/resolvers/zod`). Its inputs are **uncontrolled**: the browser's input owns its text and the library reads it through a `ref` (`TextField` forwards `ref` to the `<input>`, which is also how focus reaches the first invalid field). A **controlled** input re-renders the form on every keystroke; an uncontrolled one does not, which is why even a long form stays quick.

## When errors appear

`mode: 'onTouched'`: nothing is said while the person is still typing into a field for the first time; the first check runs when they leave it (blur), and from then on it re-runs on every change, so a message disappears the moment the value is fixed. On submit every field is checked and the first invalid one is focused.

## What is sent, what is not

- The password is never trimmed (spaces are legal), and never stored by the app or put in an error. A failed sign-in keeps the username and clears nothing the person typed.
- A name is trimmed before it is sent.
- A request is a TanStack Query **mutation** (`useMutation`): one pending state, and it is never retried by the library or the API client. A lost reply to a create is not a failed create.

## The server's words

`ApiError.message` is shown (the guide says to), except where the app has better words that cost nothing: a `401` on sign-in always reads "Wrong username or password." whether the username exists or not, on purpose (no account probing). A `409` on registration goes on the username field. A `5xx` or network failure shows the message and the `X-Correlation-Id` (`supportReference`) for support.

## Accessible errors

An error is text beside its field, linked with `aria-describedby`; the input is `aria-invalid`; focus moves to the first problem, so a keyboard or screen-reader user lands on it. A form-level error is `role="alert"` and is announced at once. Colour is never the only signal: errors carry an icon and words.

## Adding a form

1. Schema in the feature's `schemas.ts`, messages in the store's voice (say what to do; never "Invalid input").
2. `useForm` with `zodResolver`, `mode: 'onTouched'`, `defaultValues` for every field.
3. `Form` + `Field`s + `SubmitButton`; a request through `useMutation`; on failure `applyServerErrors`, then `FormError` for what is left.
4. Tests: the schema's boundaries, the server mapping, focus on the first error, one request however many submits.
