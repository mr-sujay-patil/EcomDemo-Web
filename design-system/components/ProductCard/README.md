# ProductCard

One product in the catalogue grid: tile, category, name, one-line description, price, stock and the add action.

## Use
- Lay cards out in a grid with a `space-4` gutter, columns at least 180px (`repeat(auto-fit, minmax(180px, 1fr))`). The card fills its column and stretches to the tallest card in the row, so prices and buttons line up at the bottom.
- Pass `image` with a real photo. Until there is one, the well says "Photo to come" beside the category icon, honestly, instead of a stock render or an AI-generated picture.
- The overline is a shelf label: category and SKU in mono.
- Stock: 6+ reads "18 in stock" in `success`; 1–5 reads "Only 3 left" in `accent`; 0 disables the button.
- After adding, the button reads "In your cart (1)", so the customer sees it worked without a toast.
