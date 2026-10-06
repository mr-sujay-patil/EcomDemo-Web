import type { ReactNode } from 'react'
import { Alert } from '@/components/Alert'
import { AssistantMessage } from '@/components/AssistantMessage'
import { Button } from '@/components/Button'
import { CartLine } from '@/components/CartLine'
import { Chip } from '@/components/Chip'
import { Header } from '@/components/Header'
import { Icon } from '@/components/Icon'
import type { IconName } from '@/components/Icon'
import { Logo } from '@/components/Logo'
import { OrderSummary } from '@/components/OrderSummary'
import { Price } from '@/components/Price'
import { ProductCard } from '@/components/ProductCard'
import { ProductTile } from '@/components/ProductTile'
import { QuantityStepper } from '@/components/QuantityStepper'
import { SagaTimeline } from '@/components/SagaTimeline'
import { StaffNote } from '@/components/StaffNote'
import { StatusBadge } from '@/components/StatusBadge'
import { TextField } from '@/components/TextField'
import './styleguide.css'

// Sample data only, written for this page. Nothing here comes from the backend, and no sample is a real
// product, review or note (CLAUDE.md rule 11). Totals are literals because the app never adds prices up.
const icons: IconName[] = [
  'cart',
  'search',
  'user',
  'package',
  'truck',
  'check',
  'x',
  'clock',
  'plus',
  'minus',
  'trash',
  'chevron-right',
  'alert',
  'info',
  'keyboard',
  'monitor',
  'headphones',
  'drive',
  'plug',
  'chat',
  'tag',
]

/** The samples do nothing when pressed: they are here to be looked at. */
const noop = () => undefined

function Specimen({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  const id = `sg-${title.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <section className="sg-section" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {note && <p className="ed-caption">{note}</p>}
      <div className="sg-row">{children}</div>
    </section>
  )
}

function Case({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="sg-case">
      <p className="ed-overline">{label}</p>
      {children}
    </div>
  )
}

/** Every component in its states. Dev and preview only (`src/app/router.tsx`); switch the theme in the header. */
export function StyleguidePage() {
  return (
    <div className="sg">
      <h1>Style guide</h1>
      <p className="ed-caption">
        Every component in its states. Use the theme button in the header to see them in Light and Dark.
      </p>

      <Specimen title="Icon" note="21 icons on a 24px grid, 1.5px stroke, square caps.">
        {icons.map((name) => (
          <Case key={name} label={name}>
            <Icon name={name} size={24} />
          </Case>
        ))}
      </Specimen>

      <Specimen title="Logo">
        <Case label="full">
          <Logo />
        </Case>
        <Case label="mark">
          <Logo variant="mark" />
        </Case>
      </Specimen>

      <Specimen title="Button">
        <Case label="primary">
          <Button>Place order</Button>
        </Case>
        <Case label="secondary">
          <Button variant="secondary">Browse the shelf</Button>
        </Case>
        <Case label="ghost">
          <Button variant="ghost">Not now</Button>
        </Case>
        <Case label="danger">
          <Button variant="danger">Remove</Button>
        </Case>
        <Case label="with icons">
          <Button icon="cart" iconRight="chevron-right">
            Add to cart
          </Button>
        </Case>
        <Case label="small">
          <Button size="sm" variant="secondary">
            Retry
          </Button>
        </Case>
        <Case label="loading">
          <Button loading>Place order</Button>
        </Case>
        <Case label="disabled">
          <Button disabled>Add to cart</Button>
        </Case>
        <Case label="icon only">
          <Button variant="secondary" icon="trash" aria-label="Remove item" />
        </Case>
      </Specimen>

      <Specimen title="StatusBadge">
        <Case label="PENDING">
          <StatusBadge status="PENDING" />
        </Case>
        <Case label="CONFIRMED">
          <StatusBadge status="CONFIRMED" />
        </Case>
        <Case label="CANCELLED">
          <StatusBadge status="CANCELLED" />
        </Case>
        <Case label="neutral">
          <StatusBadge>Draft</StatusBadge>
        </Case>
      </Specimen>

      <Specimen title="Chip">
        <Case label="off">
          <Chip count={7}>Audio</Chip>
        </Case>
        <Case label="selected">
          <Chip selected count={10}>
            Everything
          </Chip>
        </Case>
      </Specimen>

      <Specimen title="TextField">
        <Case label="default">
          <TextField label="Email" placeholder="you@example.com" />
        </Case>
        <Case label="with hint">
          <TextField label="Password" type="password" hint="At least 8 characters." />
        </Case>
        <Case label="with error">
          <TextField label="Email" defaultValue="not-an-email" error="Enter an address like name@example.com." />
        </Case>
        <Case label="with icon">
          <TextField label="Search" icon="search" placeholder="Search, or describe what you need" />
        </Case>
        <Case label="with a trailing action">
          <TextField
            label="Password"
            type="password"
            defaultValue="correct horse"
            trailing={
              <Button variant="ghost" size="sm" aria-label="Show password">
                Show
              </Button>
            }
          />
        </Case>
        <Case label="disabled">
          <TextField label="Username" defaultValue="locked" disabled />
        </Case>
      </Specimen>

      <Specimen title="QuantityStepper">
        <Case label="in the middle">
          <QuantityStepper defaultValue={3} />
        </Case>
        <Case label="at the minimum">
          <QuantityStepper defaultValue={1} />
        </Case>
        <Case label="at the maximum (stock of 4)">
          <QuantityStepper defaultValue={4} max={4} />
        </Case>
      </Specimen>

      <Specimen title="Price">
        <Case label="small">
          <Price amount={1299} size="sm" />
        </Case>
        <Case label="medium">
          <Price amount={8999} />
        </Case>
        <Case label="large">
          <Price amount={125000.5} size="lg" />
        </Case>
        <Case label="with a previous price">
          <Price amount={7499} compareAt={8999} />
        </Case>
      </Specimen>

      <Specimen
        title="ProductTile"
        note="With a photo it shows the product's imageUrl; without one, or if it fails to load, this well."
      >
        <Case label="well, by category">
          <div className="sg-tile">
            <ProductTile category="AUDIO" />
          </div>
        </Case>
        <Case label="well, no category">
          <div className="sg-tile">
            <ProductTile />
          </div>
        </Case>
        <Case label="small">
          <ProductTile category="STORAGE" size="sm" />
        </Case>
      </Specimen>

      <Specimen title="ProductCard">
        <Case label="in stock">
          <div className="sg-card">
            <ProductCard
              name="Sample keyboard"
              description="A sample description, two lines long, to show how the card stretches."
              price={8999}
              category="PERIPHERALS"
              stock={25}
              onAdd={noop}
            />
          </div>
        </Case>
        <Case label="low stock">
          <div className="sg-card">
            <ProductCard name="Sample monitor" price={32999} category="DISPLAYS" stock={3} onAdd={noop} />
          </div>
        </Case>
        <Case label="out of stock">
          <div className="sg-card">
            <ProductCard name="Sample sleeve" price={1799} category="ACCESSORIES" stock={0} onAdd={noop} />
          </div>
        </Case>
        <Case label="in the cart">
          <div className="sg-card">
            <ProductCard name="Sample drive" price={9499} category="STORAGE" stock={12} inCart={2} onAdd={noop} />
          </div>
        </Case>
        <Case label="long name, no button">
          <div className="sg-card">
            <ProductCard
              name="A product whose name is long enough to need several lines on a narrow screen"
              price={499}
              category="Other"
              stock={9}
            />
          </div>
        </Case>
      </Specimen>

      <Specimen title="CartLine" note="Rearranges itself when its container is narrower than 460px.">
        <Case label="normal">
          <div className="sg-wide">
            <CartLine name="Sample keyboard" category="PERIPHERALS" unitPrice={8999} lineTotal={17998} quantity={2} />
          </div>
        </Case>
        <Case label="long name, at the stock limit">
          <div className="sg-wide">
            <CartLine
              name="A product whose name is long enough to wrap onto a second line"
              category="AUDIO"
              unitPrice={24999}
              lineTotal={24999}
              quantity={1}
              max={1}
            />
          </div>
        </Case>
      </Specimen>

      <Specimen title="OrderSummary">
        <Case label="all rows">
          <OrderSummary subtotal={26997} shipping={0} discount={500} total={26497} itemCount={3} />
        </Case>
        <Case label="total only, loading">
          <OrderSummary total={26497} loading />
        </Case>
      </Specimen>

      <Specimen title="SagaTimeline">
        <Case label="pending">
          <SagaTimeline status="PENDING" current="stock" orderId={1042} times={{ placed: '12:04' }} />
        </Case>
        <Case label="confirmed">
          <SagaTimeline
            status="CONFIRMED"
            orderId={1042}
            times={{ placed: '12:04', stock: '12:04', payment: '12:05', confirmed: '12:05' }}
          />
        </Case>
        <Case label="cancelled at payment">
          <SagaTimeline status="CANCELLED" failedAt="payment" reason="The payment was declined." orderId={1043} />
        </Case>
      </Specimen>

      <Specimen title="AssistantMessage">
        <Case label="assistant, with a proposal">
          <AssistantMessage
            proposal={{ name: 'Sample keyboard', category: 'PERIPHERALS', price: 8999 }}
            sources={['catalogue']}
            onConfirm={noop}
            onDismiss={noop}
          >
            <p>A sample reply: it names the product and says why it fits.</p>
          </AssistantMessage>
        </Case>
        <Case label="customer">
          <AssistantMessage role="user">
            <p>A sample question.</p>
          </AssistantMessage>
        </Case>
      </Specimen>

      <Specimen
        title="StaffNote"
        note="Signed and dated by a real person. This sample is a placeholder the owner replaces."
      >
        <Case label="with name, role and date">
          <StaffNote name="Owner name" role="Role" date="1 Jan 2026">
            TODO(owner): a note in your own words.
          </StaffNote>
        </Case>
      </Specimen>

      <Specimen title="Alert">
        <Case label="info">
          <Alert title="Prices include GST">A sample line of detail.</Alert>
        </Case>
        <Case label="success">
          <Alert tone="success" title="Removed from your cart" onClose={noop} />
        </Case>
        <Case label="warning">
          <Alert tone="warning" title="Only 2 left" />
        </Case>
        <Case label="danger">
          <Alert tone="danger" title="We could not load the products">
            Try again in a moment.
          </Alert>
        </Case>
      </Specimen>

      <Specimen title="Header" note="The search drops onto its own row when its container is narrower than 640px.">
        <Case label="signed out">
          <div className="sg-wide">
            <Header />
          </div>
        </Case>
        <Case label="signed in, with items">
          <div className="sg-wide">
            <Header userName="Sample User" cartCount={3} />
          </div>
        </Case>
      </Specimen>
    </div>
  )
}
