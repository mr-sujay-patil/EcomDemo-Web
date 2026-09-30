# Price

A price in rupees, in the Indian grouping, set in IBM Plex Mono like a printed receipt.

## Use
- Pass rupees as a number (`14999`); the component formats `₹14,999.00`. Use `formatINR` for prices inside running text.
- `compareAt` shows a struck-through earlier price. Only use it for a real, previous price.
- Prices are `ink-strong`, never `brand` or `accent`: colour is for actions and states.
