// EcomDemo — window.EcomDemo. Types as documentation.
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from 'react';

export type IconName = 'cart' | 'search' | 'user' | 'package' | 'truck' | 'check' | 'x' | 'clock' | 'plus' | 'minus' | 'trash' | 'chevron-right' | 'alert' | 'info' | 'keyboard' | 'monitor' | 'headphones' | 'drive' | 'plug' | 'chat' | 'tag';
/** Product categories, exactly as the catalogue stores them. */
export type Category = 'PERIPHERALS' | 'DISPLAYS' | 'AUDIO' | 'STORAGE' | 'ACCESSORIES';
/** Order statuses, exactly as the order API returns them. */
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type SagaStep = 'placed' | 'stock' | 'payment' | 'confirmed';

export interface IconProps { name: IconName; /** px, default 20 */ size?: number; /** Set to make the icon meaningful; omit for decorative icons. */ label?: string; className?: string; }
export interface LogoProps { /** default 'full' */ variant?: 'full' | 'mark'; /** px, default 28 */ height?: number; className?: string; }
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** default 'primary'. One primary per view. */ variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** default 'md' (40px); 'sm' is 32px */ size?: 'sm' | 'md';
  icon?: IconName; iconRight?: IconName; loading?: boolean; block?: boolean; children?: ReactNode;
}
export interface StatusBadgeProps { status?: OrderStatus; tone?: 'neutral' | 'brand' | 'accent' | 'success' | 'danger'; children?: ReactNode; }
export interface ChipProps { selected?: boolean; count?: number; onClick?: () => void; children: ReactNode; }
export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; hint?: string; error?: string; icon?: IconName; }
export interface QuantityStepperProps { value?: number; defaultValue?: number; /** default 1 */ min?: number; /** default 99 */ max?: number; onChange?: (n: number) => void; label?: string; }
export interface PriceProps { /** rupees */ amount: number; compareAt?: number; size?: 'sm' | 'md' | 'lg'; }
export interface ProductCardProps { name: string; description?: string; price: number; compareAt?: number; category?: Category; sku?: string; /** a real photo URL; without one the well says "Photo to come" */ image?: string; /** 0 = out of stock, 1–5 = low */ stock?: number; inCart?: number; onAdd?: () => void; }
export interface CartLineProps { name: string; category?: Category; unitPrice: number; quantity: number; max?: number; onQuantity?: (n: number) => void; onRemove?: () => void; }
export interface OrderSummaryProps { subtotal: number; shipping?: number; discount?: number; itemCount?: number; loading?: boolean; cta?: string; onCheckout?: () => void; }
export interface SagaTimelineProps { status?: OrderStatus; /** the step in progress while PENDING */ current?: SagaStep; /** the step that failed when CANCELLED */ failedAt?: SagaStep; /** the reason the order API keeps */ reason?: string; orderId?: string | number; times?: Partial<Record<SagaStep, string>>; }
export interface AssistantMessageProps { role?: 'assistant' | 'user'; children: ReactNode; proposal?: { name: string; category?: Category; image?: string; price: number; quantity?: number }; sources?: string[]; onConfirm?: () => void; onDismiss?: () => void; }
export interface AlertProps { tone?: 'info' | 'success' | 'warning' | 'danger'; title?: string; children?: ReactNode; onClose?: () => void; }
/** Words a real person wrote and signed. */
export interface StaffNoteProps { children: ReactNode; name: string; role?: string; /** shown as written, e.g. "12 Sep 2026" */ date?: string; initials?: string; }
export interface HeaderProps { cartCount?: number; userName?: string; placeholder?: string; onSearch?: (q: string) => void; }

export declare function Icon(p: IconProps): JSX.Element;
export declare function Logo(p: LogoProps): JSX.Element;
export declare function Button(p: ButtonProps): JSX.Element;
export declare function StatusBadge(p: StatusBadgeProps): JSX.Element;
export declare function Chip(p: ChipProps): JSX.Element;
export declare function TextField(p: TextFieldProps): JSX.Element;
export declare function QuantityStepper(p: QuantityStepperProps): JSX.Element;
export declare function Price(p: PriceProps): JSX.Element;
export declare function ProductCard(p: ProductCardProps): JSX.Element;
export declare function CartLine(p: CartLineProps): JSX.Element;
export declare function OrderSummary(p: OrderSummaryProps): JSX.Element;
export declare function SagaTimeline(p: SagaTimelineProps): JSX.Element;
export declare function AssistantMessage(p: AssistantMessageProps): JSX.Element;
export declare function StaffNote(p: StaffNoteProps): JSX.Element;
export declare function Alert(p: AlertProps): JSX.Element;
export declare function Header(p: HeaderProps): JSX.Element;
/** ₹ in the Indian grouping: formatINR(32999) → "₹32,999.00" */
export declare function formatINR(n: number): string;
