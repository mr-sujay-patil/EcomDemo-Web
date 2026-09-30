# Icon

Outline icons drawn for EcomDemo on a 24px grid: 1.5px stroke with square caps and sharp corners, like a technical pen rather than a rounded marker. (Round-capped 2px outline sets are what every generated site ships with.)

They take `currentColor`, so set the colour on the parent (`ink` by default, `ink-muted` for secondary, `brand` inside actions).

## Use
- 20px next to text at 15px, 16px inside `sm` buttons and badges, 24px on their own.
- Decorative next to a word: leave `label` empty. Alone (an icon button): pass `label`, or give the button an `aria-label`.
- Category icons: `keyboard` = PERIPHERALS, `monitor` = DISPLAYS, `headphones` = AUDIO, `drive` = STORAGE, `plug` = ACCESSORIES.
- `chat` marks the shop assistant. There is no sparkle or magic-wand icon: the assistant is a helper at the counter, not magic.
- Use icons where they help scanning (categories, cart, status), not in front of every heading or button label.
