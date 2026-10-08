import { useId, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Price } from '@/components/Price'
import { ProductTile } from '@/components/ProductTile'
import { TextField } from '@/components/TextField'
import { categoryOf } from '@/features/catalog/shelf'
import { useSuggestions } from './api'
import { MAX_QUERY_LENGTH, toSearchParams } from './search'
import { useDebouncedValue } from './useDebouncedValue'
import './search.css'

/** About 300 ms after the last keystroke, the box asks for suggestions: fast typing sends one request, not one per key. */
export const SUGGESTION_DELAY_MS = 300

/**
 * The header's search box. Typing shows the top five matches under it (a combobox: the arrow keys move through them,
 * Enter opens the highlighted one, Escape closes the list). Enter with nothing highlighted goes to `/search?q=…`.
 * If search by meaning is off, there are simply no suggestions; the results page explains and falls back.
 */
export function SearchBox() {
  const listId = useId()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const urlQuery = pathname === '/search' ? (params.get('q') ?? '') : ''

  const [text, setText] = useState(urlQuery)
  // A new search from elsewhere (a link, Back) rewrites the box. Adjusting state while rendering is React's way to follow a prop.
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery)
  if (seenUrlQuery !== urlQuery) {
    setSeenUrlQuery(urlQuery)
    setText(urlQuery)
  }
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const trimmed = text.trim().slice(0, MAX_QUERY_LENGTH)
  const settled = useDebouncedValue(trimmed, SUGGESTION_DELAY_MS)
  const suggestions = useSuggestions(settled, open)
  const items = trimmed.length >= 2 && suggestions.isSuccess ? suggestions.data : []
  const expanded = open && items.length > 0

  function close() {
    setOpen(false)
    setActive(-1)
  }

  function go(query: string) {
    close()
    const q = query.trim().slice(0, MAX_QUERY_LENGTH)
    void navigate({
      pathname: '/search',
      search: q ? `?${toSearchParams({ q, category: null, minPrice: null, maxPrice: null })}` : '',
    })
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && items.length > 0) {
      event.preventDefault()
      setOpen(true)
      setActive((index) => (index + 1) % items.length)
    } else if (event.key === 'ArrowUp' && items.length > 0) {
      event.preventDefault()
      setOpen(true)
      setActive((index) => (index <= 0 ? items.length - 1 : index - 1))
    } else if (event.key === 'Escape') {
      close()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const chosen = expanded && active >= 0 ? items[active] : undefined
      if (chosen) {
        close()
        void navigate(`/products/${chosen.id}`)
      } else {
        go(text)
      }
    }
  }

  function onBlur(event: FocusEvent<HTMLDivElement>) {
    // Focus moving to a suggestion inside the box keeps the list open; anywhere else closes it.
    if (!event.currentTarget.contains(event.relatedTarget)) close()
  }

  return (
    <div className="ed-header-search search-box" role="search" onBlur={onBlur}>
      <TextField
        name="q"
        icon="search"
        placeholder="Search, or describe what you need"
        aria-label="Search products"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        maxLength={MAX_QUERY_LENGTH}
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onKeyDown={onKeyDown}
      />
      <ul
        id={listId}
        role="listbox"
        aria-label="Suggestions"
        className="search-suggestions"
        hidden={!expanded}
        // Pressing a suggestion must not pull focus out of the input before the click lands.
        onMouseDown={(event) => event.preventDefault()}
      >
        {items.map((product, index) => (
          <li
            key={product.id}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === active}
            className={index === active ? 'search-suggestion is-active' : 'search-suggestion'}
          >
            <Link to={`/products/${product.id}`} tabIndex={-1} onClick={close}>
              <ProductTile size="sm" category={categoryOf(product)} image={product.imageUrl} alt="" />
              <span className="search-suggestion-name">{product.name}</span>
              <Price amount={product.price} size="sm" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
