import { useEffect, useState } from 'react'
import './App.css'

const catalogUrl = 'https://api.tvmaze.com/shows?page=0'
const catalogRows = [
  { title: 'Action & adventure', genres: ['Action', 'Adventure'] },
  { title: 'Science fiction & fantasy', genres: ['Science-Fiction', 'Fantasy'] },
  { title: 'Crime & mystery', genres: ['Crime', 'Mystery', 'Thriller'] },
  { title: 'Comedy picks', genres: ['Comedy'] },
]

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [signedInEmail, setSignedInEmail] = useState('')
  const [shows, setShows] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!signedInEmail) return undefined

    const controller = new AbortController()
    async function loadCatalog() {
      setCatalogLoading(true)
      setCatalogError('')

      try {
        const response = await fetch(catalogUrl, { signal: controller.signal })
        if (!response.ok) throw new Error('The catalog could not be loaded.')

        const catalog = await response.json()
        const availableShows = catalog
          .filter((show) => show.name && show.image?.original && show.genres?.length)
          .sort((first, second) => (second.rating?.average || 0) - (first.rating?.average || 0))

        if (!availableShows.length) throw new Error('No shows with artwork were found.')
        setShows(availableShows)
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setCatalogError('The show catalog is unavailable right now. Please try again later.')
        }
      } finally {
        if (!controller.signal.aborted) setCatalogLoading(false)
      }
    }

    loadCatalog()
    return () => controller.abort()
  }, [signedInEmail])

  const matchingShows = shows.filter((show) =>
    show.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  )
  const featuredShow = shows[0]

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const normalizedEmail = email.trim()
    if (!normalizedEmail || !password) {
      setError('Please enter both your email and password.')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      })
      const result = await response.json()

      if (!response.ok) {
        setError(result.message || 'Unable to sign in. Please try again.')
        return
      }

      setSignedInEmail(result.user.email)
    } catch {
      setError('Can’t connect to the sign-in service. Check that the backend is running.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleSignOut() {
    setSignedInEmail('')
    setPassword('')
    setError('')
  }

  if (signedInEmail) {
    return (
      <main className="dashboard-page">
        <header className="browse-header">
          <a className="wordmark" href="#home" aria-label="Netflix home">NETFLIX</a>
          <nav className="browse-nav" aria-label="Catalog navigation">
            <a href="#home">Home</a>
            <a href="#popular">Popular</a>
            <a href="#catalog">Shows</a>
          </nav>
          <div className="browse-tools">
            <label className="catalog-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search titles"
                aria-label="Search titles"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <span className="browse-account" title={signedInEmail}>{signedInEmail}</span>
            <button className="sign-out" type="button" onClick={handleSignOut}>Sign out</button>
          </div>
        </header>

        <section className="browse-hero" id="home" aria-label="Featured show">
          {featuredShow && (
            <img className="featured-artwork" src={featuredShow.image.original} alt="" fetchPriority="high" />
          )}
          <div className="featured-copy">
            <p className="eyebrow">A SHOW FOR YOUR NEXT NIGHT IN</p>
            <h1>{featuredShow?.name || (catalogLoading ? 'Finding your next favorite…' : 'Discover something new')}</h1>
            {featuredShow && (
              <>
                <p className="featured-meta">
                  {featuredShow.premiered?.slice(0, 4) || 'Series'}
                  {featuredShow.rating?.average ? `  ·  ★ ${featuredShow.rating.average}` : ''}
                  {featuredShow.genres?.length ? `  ·  ${featuredShow.genres.slice(0, 2).join(', ')}` : ''}
                </p>
                <p className="featured-summary">
                  {featuredShow.summary
                    ? new DOMParser().parseFromString(featuredShow.summary, 'text/html').body.textContent.slice(0, 230)
                    : 'Explore the series, cast, and details behind this featured pick.'}
                  {featuredShow.summary?.length > 230 ? '…' : ''}
                </p>
                <a className="featured-link" href={featuredShow.url} target="_blank" rel="noreferrer">
                  Explore show <span aria-hidden="true">↗</span>
                </a>
              </>
            )}
            {catalogError && <p className="catalog-message" role="status">{catalogError}</p>}
          </div>
          <div className="featured-credit">Featured artwork via TVMaze</div>
        </section>

        <section className="catalog-section" id="catalog" aria-label="Show catalog">
          <div className="catalog-heading" id="popular">
            <div>
              <p className="eyebrow">PICK YOUR NEXT WATCH</p>
              <h2>{searchQuery ? 'Search results' : 'Popular on Netflix'}</h2>
            </div>
            <p className="catalog-count">
              {catalogLoading ? 'Loading titles…' : `${matchingShows.length} titles`}
            </p>
          </div>

          {catalogLoading && <div className="catalog-message" role="status">Loading shows and artwork…</div>}
          {!catalogLoading && catalogError && <div className="catalog-message" role="alert">{catalogError}</div>}
          {!catalogLoading && !catalogError && searchQuery && matchingShows.length === 0 && (
            <p className="catalog-message">No titles match “{searchQuery}”.</p>
          )}

          {!catalogLoading && !catalogError && !searchQuery && (
            <ShowRow title="Top-rated series" shows={shows.slice(0, 18)} />
          )}
          {!catalogLoading && !catalogError && searchQuery && matchingShows.length > 0 && (
            <ShowRow title="Matches" shows={matchingShows.slice(0, 30)} />
          )}
          {!catalogLoading && !catalogError && !searchQuery && catalogRows.map((row) => {
            const rowShows = shows.filter((show) => row.genres.some((genre) => show.genres.includes(genre)))
            return <ShowRow key={row.title} title={row.title} shows={rowShows.slice(0, 18)} />
          })}
        </section>

        <footer className="browse-footer">
          <div className="footer-main">
            <div>
              <a className="wordmark footer-wordmark" href="#home">NETFLIX</a>
              <p>A streaming-style browsing demo. Playback is not available.</p>
            </div>
            <div className="footer-links">
              <a href="#home">Browse</a>
              <a href="https://www.tvmaze.com/" target="_blank" rel="noreferrer">TVMaze</a>
              <a href="https://www.tvmaze.com/api" target="_blank" rel="noreferrer">API details</a>
            </div>
          </div>
          <p className="attribution">
            Series details, ratings, and artwork provided by{' '}
            <a href="https://www.tvmaze.com/" target="_blank" rel="noreferrer">TVMaze</a>.
          </p>
        </footer>
      </main>
    )
  }

  return (
    <main className="login-page">
      <div className="backdrop" aria-hidden="true" />
      <header className="site-header">
        <a className="wordmark" href="#home" aria-label="Netflix home">NETFLIX</a>
      </header>
      <section className="login-panel" aria-labelledby="login-title">
        <h1 id="login-title">Sign In</h1>
        <form onSubmit={handleSubmit} noValidate>
          <label className="field-label" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Email or mobile number"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'login-error' : undefined}
          />
          <label className="field-label" htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'login-error' : undefined}
          />
          {error && <p className="form-error" id="login-error" role="alert">{error}</p>}
          <button className="submit-button" type="submit" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <div className="form-options">
          <label className="remember-option">
            <input type="checkbox" defaultChecked />
            <span>Remember me</span>
          </label>
          <span>Need help?</span>
        </div>
        <p className="signup-copy">New to Netflix? <strong>Sign up now.</strong></p>
        <p className="fine-print">
          This page is protected by Google reCAPTCHA to ensure you’re not a bot.
        </p>
      </section>
      <footer className="page-footer">
        Questions? Call <a href="tel:000-800-919-1743">000-800-919-1743</a>
      </footer>
    </main>
  )
}

function ShowRow({ title, shows }) {
  if (!shows.length) return null

  return (
    <section className="show-row" aria-label={title}>
      <h3>{title}</h3>
      <div className="show-strip">
        {shows.map((show) => (
          <a
            className="show-card"
            href={show.url}
            key={show.id}
            target="_blank"
            rel="noreferrer"
            aria-label={`${show.name}, ${show.rating?.average ? `rated ${show.rating.average}` : 'show details'}`}
          >
            <div className="poster-frame">
              <img src={show.image.medium || show.image.original} alt={`${show.name} poster`} loading="lazy" />
              <span className="poster-rating">
                {show.rating?.average ? `★ ${show.rating.average}` : 'VIEW'}
              </span>
            </div>
            <span className="show-title">{show.name}</span>
            <span className="show-genre">{show.genres.slice(0, 2).join(' · ')}</span>
          </a>
        ))}
      </div>
    </section>
  )
}

export default App
