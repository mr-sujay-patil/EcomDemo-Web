# QuantityStepper

A compact − / + control for the quantity of one cart line.

## Use
- `max` = the stock available, so a customer cannot ask for more than exists; the + disables there.
- `min` is 1. Removing a line is the trash button beside it, not stepping down to 0.
- Controlled (`value` + `onChange`) in a cart, uncontrolled (`defaultValue`) in demos.
- Give each stepper a `label` naming the product, for screen readers.
