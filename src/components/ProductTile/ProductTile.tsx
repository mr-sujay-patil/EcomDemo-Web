import { useState } from 'react'
import { cx } from '../cx'
import { Icon, type IconName } from '../Icon'
import './ProductTile.css'

const CATEGORY_ICON: Record<string, IconName> = {
  PERIPHERALS: 'keyboard',
  DISPLAYS: 'monitor',
  AUDIO: 'headphones',
  STORAGE: 'drive',
  ACCESSORIES: 'plug',
}

export type ProductTileProps = {
  /** The category name as the catalogue stores it; picks the placeholder's icon. */
  category?: string | null
  /** The product's `imageUrl` (a path on this origin). Without one, or if it fails to load, the well says "Photo to come". */
  image?: string | null
  /** Describes the photo: the product's name. The placeholder is hidden from screen readers. */
  alt?: string
  size?: 'sm' | 'md'
  /**
   * The photo is the main content of the page (a product's own page), so the browser should fetch it at once and first.
   * Without this the photo is lazy, as a card on a shelf should be: only fetched when it is about to be seen.
   */
  priority?: boolean
}

export function ProductTile({ category, image, alt = '', size = 'md', priority = false }: ProductTileProps) {
  // The url that failed, so a different image for the same tile gets its own chance.
  const [failed, setFailed] = useState<string | null>(null)
  if (image && image !== failed) {
    return (
      <div className={cx('ed-tile', `ed-tile--${size}`, 'has-photo')}>
        <img
          src={image}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          onError={() => setFailed(image)}
        />
      </div>
    )
  }
  const icon = (category && CATEGORY_ICON[category.toUpperCase()]) || 'package'
  return (
    <div className={cx('ed-tile', `ed-tile--${size}`)} aria-hidden>
      <Icon name={icon} size={size === 'sm' ? 22 : 40} />
      {size === 'sm' ? null : <span className="ed-tile-note">Photo to come</span>}
    </div>
  )
}
