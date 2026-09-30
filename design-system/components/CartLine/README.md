# CartLine

One row of the cart: tile, name, unit price, quantity, line total and remove.

## Use
- The name and price come from the cart item's snapshot of the product, as the cart API stores them.
- `max` = the product's stock. Line totals update as the quantity changes.
- Remove is immediate. Offer an undo in an `Alert` instead of a confirmation dialog.
