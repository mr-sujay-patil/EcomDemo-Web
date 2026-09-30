// EcomDemo components. Hand-written for this design system (the repository has no UI).
// Built with esbuild as one IIFE that reads window.React and assigns window.EcomDemo.
import { ICONS, MARK } from './assets';

const React = (window as any).React;
const { useState } = React;
const h = React.createElement;

const cx = (...c: any[]) => c.filter(Boolean).join(' ');
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
export const formatINR = (n: number) => inr.format(n);

/* ---------- Icon ---------- */
export function Icon({ name, size = 20, label, className }: any) {
  const body = ICONS[name];
  if (!body) return null;
  return h('svg', {
    className: cx('ed-icon', className), width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'square', strokeLinejoin: 'miter',
    role: label ? 'img' : undefined, 'aria-label': label, 'aria-hidden': label ? undefined : true,
    dangerouslySetInnerHTML: { __html: body },
  });
}

/* ---------- Logo: a shipping tag on a loose string, and the wordmark ---------- */
export function Logo({ variant = 'full', height = 28, className }: any) {
  const W = variant === 'mark' ? 32 : 42 + MARK.width;
  return h('svg', { className: cx('ed-logo', className), viewBox: `0 0 ${W} 28`, height, width: (height * W) / 28, role: 'img', 'aria-label': 'EcomDemo' },
    h('path', { className: 'ed-logo-brand', fillRule: 'evenodd', d: `${MARK.tag} ${MARK.hole}` }),
    h('path', { className: 'ed-logo-string', d: MARK.string, fill: 'none', strokeWidth: 1.3, strokeLinecap: 'round' }),
    variant === 'mark' ? null : h('g', { className: 'ed-logo-ink', transform: `translate(42 ${MARK.base})` },
      h('path', { d: MARK.ecom }), h('path', { d: MARK.demo })));
}

/* ---------- Button ---------- */
export function Button({ variant = 'primary', size = 'md', icon, iconRight, loading, disabled, block, children, ...rest }: any) {
  return h('button', {
    type: 'button', ...rest, disabled: disabled || loading, 'aria-busy': loading || undefined,
    className: cx('ed-btn', `ed-btn--${variant}`, `ed-btn--${size}`, block && 'ed-btn--block', !children && 'ed-btn--icon', rest.className),
  },
    loading ? h('span', { className: 'ed-spinner', 'aria-hidden': true }) : icon ? h(Icon, { name: icon, size: size === 'sm' ? 16 : 18 }) : null,
    children ? h('span', null, children) : null,
    iconRight ? h(Icon, { name: iconRight, size: size === 'sm' ? 16 : 18 }) : null);
}

/* ---------- StatusBadge ---------- */
const STATUS: any = {
  PENDING: { tone: 'accent', label: 'Pending', icon: 'clock' },
  CONFIRMED: { tone: 'success', label: 'Confirmed', icon: 'check' },
  CANCELLED: { tone: 'danger', label: 'Cancelled', icon: 'x' },
};
export function StatusBadge({ status, tone, children }: any) {
  const s = status ? STATUS[status] : null;
  const t = tone || (s ? s.tone : 'neutral');
  return h('span', { className: cx('ed-badge', `ed-badge--${t}`) },
    s ? h(Icon, { name: s.icon, size: 14 }) : null,
    children || (s ? s.label : null));
}

/* ---------- Chip ---------- */
export function Chip({ selected, count, onClick, children }: any) {
  return h('button', { type: 'button', className: cx('ed-chip', selected && 'is-selected'), 'aria-pressed': !!selected, onClick },
    selected ? h(Icon, { name: 'check', size: 14 }) : null,
    h('span', null, children),
    count != null ? h('span', { className: 'ed-chip-count' }, count) : null);
}

/* ---------- TextField ---------- */
let fid = 0;
export function TextField({ label, hint, error, icon, id, ...rest }: any) {
  const [auto] = useState(() => `ed-f${++fid}`);
  const fieldId = id || auto;
  const note = error || hint;
  return h('div', { className: cx('ed-field', error && 'has-error') },
    label ? h('label', { className: 'ed-field-label', htmlFor: fieldId }, label) : null,
    h('div', { className: 'ed-field-box' },
      icon ? h(Icon, { name: icon, size: 18 }) : null,
      h('input', { id: fieldId, className: 'ed-field-input', 'aria-invalid': !!error || undefined, 'aria-describedby': note ? fieldId + '-n' : undefined, ...rest })),
    note ? h('p', { id: fieldId + '-n', className: 'ed-field-note' }, error ? h(Icon, { name: 'alert', size: 14 }) : null, note) : null);
}

/* ---------- QuantityStepper ---------- */
export function QuantityStepper({ value, defaultValue = 1, min = 1, max = 99, onChange, label = 'Quantity' }: any) {
  const [inner, setInner] = useState(defaultValue);
  const v = value ?? inner;
  const set = (n: number) => { const c = Math.max(min, Math.min(max, n)); if (value == null) setInner(c); onChange && onChange(c); };
  return h('div', { className: 'ed-stepper', role: 'group', 'aria-label': label },
    h('button', { type: 'button', onClick: () => set(v - 1), disabled: v <= min, 'aria-label': 'Decrease' }, h(Icon, { name: 'minus', size: 16 })),
    h('output', { 'aria-live': 'polite' }, v),
    h('button', { type: 'button', onClick: () => set(v + 1), disabled: v >= max, 'aria-label': 'Increase' }, h(Icon, { name: 'plus', size: 16 })));
}

/* ---------- Price ---------- */
export function Price({ amount, compareAt, size = 'md' }: any) {
  return h('span', { className: cx('ed-price', `ed-price--${size}`) },
    h('span', { className: 'ed-price-now' }, formatINR(amount)),
    compareAt ? h('s', { className: 'ed-price-was' }, formatINR(compareAt)) : null);
}

/* ---------- ProductCard ---------- */
const CATEGORY_ICON: any = { PERIPHERALS: 'keyboard', DISPLAYS: 'monitor', AUDIO: 'headphones', STORAGE: 'drive', ACCESSORIES: 'plug' };
const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
export function ProductTile({ category, image, alt = '', size = 'md' }: any) {
  if (image) return h('div', { className: cx('ed-tile', `ed-tile--${size}`, 'has-photo') }, h('img', { src: image, alt }));
  return h('div', { className: cx('ed-tile', `ed-tile--${size}`), 'aria-hidden': true },
    h(Icon, { name: CATEGORY_ICON[category] || 'package', size: size === 'sm' ? 22 : 40 }),
    size === 'sm' ? null : h('span', { className: 'ed-tile-note' }, 'Photo to come'));
}
export function ProductCard({ name, description, price, compareAt, category, sku, image, stock, inCart = 0, onAdd }: any) {
  const out = stock === 0;
  const low = !out && stock != null && stock <= 5;
  return h('article', { className: 'ed-card ed-product' },
    h(ProductTile, { category, image, alt: name }),
    h('div', { className: 'ed-product-body' },
      category || sku ? h('p', { className: 'ed-overline' }, category ? h('span', null, category) : null, category && sku ? ' · ' : null, sku ? h('span', null, `SKU ${sku}`) : null) : null,
      h('h3', { className: 'ed-product-name' }, name),
      description ? h('p', { className: 'ed-product-desc' }, description) : null,
      h('div', { className: 'ed-product-foot' },
        h(Price, { amount: price, compareAt }),
        h('span', { className: cx('ed-stock', out ? 'is-out' : low ? 'is-low' : 'is-in') },
          out ? 'Out of stock' : low ? `Only ${stock} left` : stock != null ? `${stock} in stock` : '')),
      h(Button, { variant: inCart ? 'secondary' : 'primary', icon: inCart ? 'check' : undefined, block: true, disabled: out, onClick: onAdd },
        out ? 'Out of stock' : inCart ? `In your cart (${inCart})` : 'Add to cart')));
}

/* ---------- CartLine ---------- */
export function CartLine({ name, category, unitPrice, quantity, onQuantity, onRemove, max }: any) {
  return h('div', { className: 'ed-cartline-wrap' }, h('div', { className: 'ed-cartline' },
    h(ProductTile, { category, size: 'sm' }),
    h('div', { className: 'ed-cartline-main' },
      h('p', { className: 'ed-cartline-name' }, name),
      h('p', { className: 'ed-caption' }, `${formatINR(unitPrice)} each`)),
    h(QuantityStepper, { value: quantity, onChange: onQuantity, max, label: `Quantity of ${name}` }),
    h('span', { className: 'ed-cartline-total' }, formatINR(unitPrice * quantity)),
    h(Button, { variant: 'ghost', size: 'sm', icon: 'trash', 'aria-label': `Remove ${name}`, onClick: onRemove })));
}

/* ---------- OrderSummary ---------- */
export function OrderSummary({ subtotal, shipping = 0, discount = 0, itemCount, onCheckout, loading, cta = 'Place order' }: any) {
  const total = subtotal + shipping - discount;
  const row = (k: string, v: any, cls?: string) => h('div', { className: cx('ed-sum-row', cls) }, h('dt', null, k), h('dd', null, v));
  return h('section', { className: 'ed-panel ed-summary', 'aria-label': 'Order summary' },
    h('h3', { className: 'ed-summary-title' }, 'Order summary'),
    h('dl', null,
      row(`Subtotal${itemCount ? ` (${itemCount} item${itemCount > 1 ? 's' : ''})` : ''}`, formatINR(subtotal)),
      row('Shipping', shipping ? formatINR(shipping) : 'Free', shipping ? '' : 'is-free'),
      discount ? row('Discount', '− ' + formatINR(discount), 'is-free') : null,
      row('Total', formatINR(total), 'is-total')),
    h(Button, { block: true, iconRight: 'chevron-right', loading, onClick: onCheckout }, cta),
    h('p', { className: 'ed-caption ed-summary-note' }, 'We reserve your items and take payment as soon as you place the order. It usually takes a few seconds.'));
}

/* ---------- SagaTimeline ---------- */
const STEPS = [
  { key: 'placed', label: 'Order placed', icon: 'package' },
  { key: 'stock', label: 'Stock reserved', icon: 'drive' },
  { key: 'payment', label: 'Payment taken', icon: 'check' },
  { key: 'confirmed', label: 'Confirmed', icon: 'truck' },
];
export function SagaTimeline({ status = 'PENDING', current = 'stock', failedAt, reason, orderId, times = {} }: any) {
  const idx = (k: string) => STEPS.findIndex((s) => s.key === k);
  const cur = status === 'CONFIRMED' ? STEPS.length : status === 'CANCELLED' ? idx(failedAt || 'stock') : idx(current);
  return h('section', { className: 'ed-saga', 'aria-label': 'Order progress' },
    h('header', { className: 'ed-saga-head' },
      orderId ? h('span', { className: 'ed-id' }, `Order #${orderId}`) : null,
      h(StatusBadge, { status })),
    h('ol', { className: 'ed-saga-steps' },
      STEPS.map((s, i) => {
        const state = i < cur ? 'done' : i === cur ? (status === 'CANCELLED' ? 'failed' : 'current') : status === 'CANCELLED' ? 'skipped' : 'todo';
        const note = state === 'failed' ? reason : state === 'current' ? 'In progress…' : state === 'skipped' ? 'Not reached' : times[s.key];
        return h('li', { key: s.key, className: `ed-step is-${state}` },
          h('span', { className: 'ed-step-dot' }, h(Icon, { name: state === 'done' ? 'check' : state === 'failed' ? 'x' : state === 'current' ? 'clock' : s.icon, size: 16 })),
          h('span', { className: 'ed-step-text' },
            h('span', { className: 'ed-step-label' }, s.label),
            note ? h('span', { className: 'ed-step-note' }, note) : null));
      })));
}

/* ---------- AssistantMessage ---------- */
export function AssistantMessage({ role = 'assistant', children, proposal, sources, onConfirm, onDismiss }: any) {
  const mine = role === 'user';
  return h('div', { className: cx('ed-msg', mine ? 'is-user' : 'is-assistant') },
    h('div', { className: 'ed-msg-bubble' },
      mine ? null : h('p', { className: 'ed-msg-who' }, h(Icon, { name: 'chat', size: 14 }), 'Shop assistant'),
      h('div', { className: 'ed-msg-text' }, children),
      proposal ? h('div', { className: 'ed-proposal' },
        h(ProductTile, { category: proposal.category, image: proposal.image, size: 'sm' }),
        h('div', { className: 'ed-proposal-main' },
          h('p', { className: 'ed-cartline-name' }, proposal.name),
          h('p', { className: 'ed-caption' }, h('span', { className: 'ed-mono' }, formatINR(proposal.price)), ` · add ${proposal.quantity || 1} to your cart?`)),
        h('div', { className: 'ed-proposal-actions' },
          h(Button, { size: 'sm', onClick: onConfirm }, 'Add it'),
          h(Button, { size: 'sm', variant: 'ghost', onClick: onDismiss }, 'Not now'))) : null,
      sources && sources.length ? h('p', { className: 'ed-msg-sources' }, 'Checked: ', sources.join(', ')) : null));
}

/* ---------- StaffNote: words a real person wrote, signed and dated ---------- */
export function StaffNote({ children, name, role, date, initials }: any) {
  const ini = initials || (name ? name.split(' ').map((p: string) => p[0]).slice(0, 2).join('') : '');
  return h('figure', { className: 'ed-note' },
    h('blockquote', { className: 'ed-note-text' }, children),
    h('figcaption', { className: 'ed-note-by' },
      h('span', { className: 'ed-note-initials', 'aria-hidden': true }, ini),
      h('span', null, h('span', { className: 'ed-note-name' }, name), role ? h('span', { className: 'ed-caption' }, role) : null),
      date ? h('time', { className: 'ed-note-date' }, date) : null));
}

/* ---------- Alert ---------- */
const ALERT_ICON: any = { info: 'info', success: 'check', warning: 'alert', danger: 'alert' };
export function Alert({ tone = 'info', title, children, onClose }: any) {
  return h('div', { className: cx('ed-alert', `ed-alert--${tone}`), role: tone === 'danger' ? 'alert' : 'status' },
    h(Icon, { name: ALERT_ICON[tone], size: 20 }),
    h('div', { className: 'ed-alert-body' }, title ? h('p', { className: 'ed-alert-title' }, title) : null, children ? h('div', null, children) : null),
    onClose ? h(Button, { variant: 'ghost', size: 'sm', icon: 'x', 'aria-label': 'Dismiss', onClick: onClose }) : null);
}

/* ---------- Header ---------- */
export function Header({ cartCount = 0, userName, onSearch, placeholder = 'Search, or describe what you need' }: any) {
  return h('div', { className: 'ed-header-wrap' }, h('header', { className: 'ed-header' },
    h(Logo, { height: 26 }),
    h('form', { className: 'ed-header-search', role: 'search', onSubmit: (e: any) => { e.preventDefault(); onSearch && onSearch(e.target.q.value); } },
      h(TextField, { name: 'q', icon: 'search', placeholder, 'aria-label': 'Search products' })),
    h('nav', { className: 'ed-header-nav' },
      h(Button, { variant: 'ghost', icon: 'user', 'aria-label': userName ? `Account: ${userName}` : 'Sign in' }, userName || 'Sign in'),
      h('span', { className: 'ed-cart-btn' },
        h(Button, { variant: 'secondary', icon: 'cart', 'aria-label': `Cart, ${cartCount} items` }),
        cartCount ? h('span', { className: 'ed-cart-count', 'aria-hidden': true }, cartCount) : null))));
}

(window as any).EcomDemo = {
  Icon, Logo, Button, StatusBadge, Chip, TextField, QuantityStepper, Price, ProductTile, ProductCard,
  CartLine, OrderSummary, SagaTimeline, AssistantMessage, StaffNote, Alert, Header, formatINR, ICON_NAMES: Object.keys(ICONS),
};
