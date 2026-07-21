'use client'

import { FormEvent, useEffect, useState } from 'react'

import styles from './luxe-bites-admin.module.css'

const SUPABASE_URL = 'https://bpynafeivwkvhtgxmnfz.supabase.co'
const SUPABASE_KEY = 'sb_publishable_jnLojIpNv0Gqcfu_zfoz1w_WvC9mYXX'
const SESSION_KEY = 'luxe-bites-manager-session-v1'

const ORDER_STATUSES = [
  'new',
  'confirmed',
  'deposit-paid',
  'preparing',
  'ready',
  'completed',
  'cancelled',
] as const

type OrderStatus = typeof ORDER_STATUSES[number]

type Order = {
  id: string
  reference: string
  customerName: string
  phone: string
  email?: string | null
  orderDetails: string
  fulfilment: string
  address?: string | null
  eventDate?: string | null
  notes?: string | null
  status: OrderStatus
  source: string
  createdAt: string
}

type Product = {
  id: string
  name: string
  description?: string | null
  price: number
  available: boolean
  featured: boolean
  sortOrder: number
}

type Settings = {
  businessName: string
  tagline: string
  whatsappNumber: string
  minimumOrder: number
  depositPercentage: number
  deliveryFee: number
  chatbotEnabled: boolean
}

type Dashboard = {
  manager: { id: string; email: string; name: string; role: string }
  orders: Order[]
  products: Product[]
  settings: Settings
}

type SessionResult = { sessionToken: string; expiresAt: string }
type Tab = 'orders' | 'products' | 'settings'

const DEMO_DASHBOARD: Dashboard = {
  manager: {
    id: 'demo-manager',
    email: 'demo@luxebites.local',
    name: 'Sam',
    role: 'manager',
  },
  orders: [
    {
      id: 'demo-order-1',
      reference: 'LB-DEMO1001',
      customerName: 'Ayanda Mthembu',
      phone: '071 555 0101',
      email: 'ayanda@example.com',
      orderDetails: '20 Oreo mousse cups and 20 Lotus Biscoff cups',
      fulfilment: 'delivery',
      address: 'Richards Bay, KwaZulu-Natal',
      eventDate: '2026-07-26',
      notes: 'Birthday setup. Please confirm delivery time.',
      status: 'new',
      source: 'website',
      createdAt: '2026-07-21T13:45:00.000Z',
    },
    {
      id: 'demo-order-2',
      reference: 'LB-DEMO1002',
      customerName: 'Lerato Nkosi',
      phone: '082 555 0144',
      email: null,
      orderDetails: '30 Black Forest dessert cups',
      fulfilment: 'collection',
      address: null,
      eventDate: '2026-07-29',
      notes: 'School staff function.',
      status: 'confirmed',
      source: 'website',
      createdAt: '2026-07-21T14:20:00.000Z',
    },
  ],
  products: [
    { id: 'demo-product-1', name: 'Black forest dessert', description: 'Chocolate cake, cream and cherry layers.', price: 20, available: true, featured: true, sortOrder: 1 },
    { id: 'demo-product-2', name: 'Oreo / chocolate mousse', description: 'Creamy chocolate mousse with Oreo pieces.', price: 25, available: true, featured: true, sortOrder: 2 },
    { id: 'demo-product-3', name: 'Cheesecake (any)', description: 'Individual cheesecake dessert cups.', price: 25, available: true, featured: false, sortOrder: 3 },
    { id: 'demo-product-4', name: 'Red velvet pudding', description: 'Soft red velvet pudding with cream.', price: 20, available: true, featured: false, sortOrder: 4 },
    { id: 'demo-product-5', name: 'Peppermint Crisp', description: 'Peppermint caramel dessert cup.', price: 25, available: true, featured: false, sortOrder: 5 },
    { id: 'demo-product-6', name: 'Lotus Biscoff', description: 'Biscoff biscuit and caramel cream layers.', price: 30, available: true, featured: true, sortOrder: 6 },
    { id: 'demo-product-7', name: 'Malva pudding', description: 'Warm-style malva pudding dessert cup.', price: 20, available: true, featured: false, sortOrder: 7 },
  ],
  settings: {
    businessName: 'Sammy’s Sweets | Luxe Bites',
    tagline: 'Premium flavours. Elegant presentation. Perfect for events.',
    whatsappNumber: '27832656484',
    minimumOrder: 10,
    depositPercentage: 50,
    deliveryFee: 100,
    chatbotEnabled: true,
  },
}

async function rpc<T>(name: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => null) as { message?: string } | T | null
  if (!response.ok) {
    throw new Error((data && typeof data === 'object' && 'message' in data && data.message) || 'The request failed.')
  }
  return data as T
}

export function LuxeBitesAdmin() {
  const [ready, setReady] = useState(false)
  const [demoMode, setDemoMode] = useState(false)
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [tab, setTab] = useState<Tab>('orders')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const isDemo = params.get('demo') === '1'
    setDemoMode(isDemo)
    setInviteToken(params.get('invite'))

    if (isDemo) {
      setDashboard(structuredClone(DEMO_DASHBOARD))
      setSessionToken(null)
    } else {
      setSessionToken(window.localStorage.getItem(SESSION_KEY))
    }

    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready || demoMode || !sessionToken) return
    let cancelled = false
    setBusy(true)
    setError('')

    void rpc<Dashboard>('get_luxe_bites_dashboard', { p_session_token: sessionToken })
      .then((data) => {
        if (!cancelled) setDashboard(data)
      })
      .catch((reason: unknown) => {
        if (cancelled) return
        window.localStorage.removeItem(SESSION_KEY)
        setSessionToken(null)
        setDashboard(null)
        setError(reason instanceof Error ? reason.message : 'Your session expired. Please sign in again.')
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })

    return () => { cancelled = true }
  }, [ready, demoMode, sessionToken])

  function demoNotice(text: string) {
    setError('')
    setMessage(`${text} Demo mode does not change live data.`)
  }

  async function refresh() {
    if (demoMode) {
      setDashboard(structuredClone(DEMO_DASHBOARD))
      demoNotice('Demo data refreshed.')
      return
    }
    if (!sessionToken) return
    const data = await rpc<Dashboard>('get_luxe_bites_dashboard', { p_session_token: sessionToken })
    setDashboard(data)
  }

  function saveSession(result: SessionResult) {
    window.localStorage.setItem(SESSION_KEY, result.sessionToken)
    window.history.replaceState({}, '', '/admin')
    setInviteToken(null)
    setSessionToken(result.sessionToken)
  }

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!inviteToken || busy) return
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') || '')
    const confirm = String(form.get('confirm') || '')
    if (password !== confirm) {
      setError('The passwords do not match.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const result = await rpc<SessionResult>('activate_luxe_bites_manager', {
        p_invite_token: inviteToken,
        p_password: password,
      })
      saveSession(result)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The invitation could not be activated.')
    } finally {
      setBusy(false)
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      const result = await rpc<SessionResult>('login_luxe_bites_manager', {
        p_email: String(form.get('email') || '').trim(),
        p_password: String(form.get('password') || ''),
      })
      saveSession(result)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    if (demoMode) {
      window.location.href = '/admin'
      return
    }
    if (sessionToken) {
      await rpc('logout_luxe_bites_manager', { p_session_token: sessionToken }).catch(() => undefined)
    }
    window.localStorage.removeItem(SESSION_KEY)
    setSessionToken(null)
    setDashboard(null)
    setMessage('')
  }

  async function changeOrderStatus(orderId: string, status: OrderStatus) {
    if (!dashboard) return
    if (demoMode) {
      setDashboard({
        ...dashboard,
        orders: dashboard.orders.map((order) => order.id === orderId ? { ...order, status } : order),
      })
      demoNotice('Order status changed on screen.')
      return
    }
    if (!sessionToken) return

    setBusy(true)
    setError('')
    try {
      await rpc('update_luxe_bites_order_status', {
        p_session_token: sessionToken,
        p_order_id: orderId,
        p_status: status,
      })
      setDashboard({
        ...dashboard,
        orders: dashboard.orders.map((order) => order.id === orderId ? { ...order, status } : order),
      })
      setMessage('Order status updated.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update the order.')
    } finally {
      setBusy(false)
    }
  }

  function updateProductLocal(id: string, patch: Partial<Product>) {
    if (!dashboard) return
    setDashboard({
      ...dashboard,
      products: dashboard.products.map((product) => product.id === id ? { ...product, ...patch } : product),
    })
  }

  async function saveProduct(product: Product) {
    if (demoMode) {
      demoNotice(`${product.name} saved on screen.`)
      return
    }
    if (!sessionToken) return

    setBusy(true)
    setError('')
    try {
      await rpc('update_luxe_bites_product', {
        p_session_token: sessionToken,
        p_product_id: product.id,
        p_name: product.name,
        p_description: product.description || '',
        p_price: Number(product.price),
        p_available: product.available,
        p_featured: product.featured,
        p_sort_order: Number(product.sortOrder),
      })
      setMessage(`${product.name} saved.`)
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save the product.')
    } finally {
      setBusy(false)
    }
  }

  function updateSettingsLocal(patch: Partial<Settings>) {
    if (!dashboard) return
    setDashboard({ ...dashboard, settings: { ...dashboard.settings, ...patch } })
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!dashboard) return
    if (demoMode) {
      demoNotice('Business settings saved on screen.')
      return
    }
    if (!sessionToken) return

    const settings = dashboard.settings
    setBusy(true)
    setError('')
    try {
      await rpc('update_luxe_bites_settings', {
        p_session_token: sessionToken,
        p_business_name: settings.businessName,
        p_tagline: settings.tagline,
        p_whatsapp_number: settings.whatsappNumber,
        p_minimum_order: Number(settings.minimumOrder),
        p_deposit_percentage: Number(settings.depositPercentage),
        p_delivery_fee: Number(settings.deliveryFee),
        p_chatbot_enabled: settings.chatbotEnabled,
      })
      setMessage('Business settings saved.')
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save the settings.')
    } finally {
      setBusy(false)
    }
  }

  if (!ready) return <main className={styles.center}><p>Loading…</p></main>

  if (inviteToken && !sessionToken && !demoMode) {
    return (
      <main className={styles.center}>
        <section className={styles.authCard}>
          <p className={styles.eyebrow}>Luxe Bites manager invitation</p>
          <h1>Create your password</h1>
          <p>This one-time link gives you access only to Luxe Bites orders, products, and business settings.</p>
          <form onSubmit={activate} className={styles.form}>
            <label>Password<input name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" /></label>
            <label>Confirm password<input name="confirm" type="password" required minLength={10} maxLength={128} autoComplete="new-password" /></label>
            <button disabled={busy} type="submit">{busy ? 'Activating…' : 'Activate manager access'}</button>
          </form>
          {error && <p className={styles.error}>{error}</p>}
        </section>
      </main>
    )
  }

  if (!demoMode && (!sessionToken || !dashboard)) {
    return (
      <main className={styles.center}>
        <section className={styles.authCard}>
          <p className={styles.eyebrow}>Sammy’s Sweets | Luxe Bites</p>
          <h1>Manager sign in</h1>
          <p>Private access for authorised Luxe Bites managers.</p>
          <form onSubmit={login} className={styles.form}>
            <label>Email<input name="email" type="email" required autoComplete="email" /></label>
            <label>Password<input name="password" type="password" required autoComplete="current-password" /></label>
            <button disabled={busy} type="submit">{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <button className={styles.secondaryButton} type="button" onClick={() => { window.location.href = '/admin?demo=1' }}>
            View safe demo
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </section>
      </main>
    )
  }

  if (!dashboard) return <main className={styles.center}><p>Loading dashboard…</p></main>

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{demoMode ? 'Luxe Bites dashboard demo' : 'Luxe Bites manager dashboard'}</p>
          <h1>Welcome, {dashboard.manager.name}</h1>
          <p>{dashboard.orders.length} order request{dashboard.orders.length === 1 ? '' : 's'} · {dashboard.products.length} products</p>
        </div>
        <button className={styles.secondaryButton} type="button" onClick={() => void logout()}>{demoMode ? 'Exit demo' : 'Sign out'}</button>
      </header>

      {demoMode && <p className={styles.success}>Demo mode: explore freely. Nothing here changes the live business data.</p>}

      <nav className={styles.tabs} aria-label="Dashboard sections">
        {(['orders', 'products', 'settings'] as Tab[]).map((item) => (
          <button key={item} className={tab === item ? styles.activeTab : ''} onClick={() => setTab(item)} type="button">
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </nav>

      {(message || error) && <p className={error ? styles.error : styles.success}>{error || message}</p>}

      {tab === 'orders' && (
        <section className={styles.section}>
          <div className={styles.sectionHeading}><h2>Orders</h2><button type="button" className={styles.secondaryButton} onClick={() => void refresh()}>Refresh</button></div>
          {dashboard.orders.length === 0 ? <div className={styles.empty}>No order requests yet.</div> : (
            <div className={styles.orderGrid}>
              {dashboard.orders.map((order) => (
                <article className={styles.orderCard} key={order.id}>
                  <div className={styles.orderTop}><strong>{order.reference}</strong><time>{new Date(order.createdAt).toLocaleString()}</time></div>
                  <h3>{order.customerName}</h3>
                  <p><a href={`tel:${order.phone}`}>{order.phone}</a>{order.email ? ` · ${order.email}` : ''}</p>
                  <dl>
                    <div><dt>Order</dt><dd>{order.orderDetails}</dd></div>
                    <div><dt>Fulfilment</dt><dd>{order.fulfilment}{order.address ? ` — ${order.address}` : ''}</dd></div>
                    {order.eventDate && <div><dt>Event date</dt><dd>{order.eventDate}</dd></div>}
                    {order.notes && <div><dt>Notes</dt><dd>{order.notes}</dd></div>}
                  </dl>
                  <label className={styles.statusLabel}>Status
                    <select value={order.status} disabled={busy} onChange={(event) => void changeOrderStatus(order.id, event.target.value as OrderStatus)}>
                      {ORDER_STATUSES.map((status) => <option value={status} key={status}>{status.replace('-', ' ')}</option>)}
                    </select>
                  </label>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'products' && (
        <section className={styles.section}>
          <h2>Menu products</h2>
          <div className={styles.productGrid}>
            {dashboard.products.map((product) => (
              <article className={styles.productCard} key={product.id}>
                <label>Name<input value={product.name} onChange={(event) => updateProductLocal(product.id, { name: event.target.value })} /></label>
                <label>Description<textarea rows={2} value={product.description || ''} onChange={(event) => updateProductLocal(product.id, { description: event.target.value })} /></label>
                <div className={styles.inlineFields}>
                  <label>Price (R)<input type="number" min="0" step="0.01" value={product.price} onChange={(event) => updateProductLocal(product.id, { price: Number(event.target.value) })} /></label>
                  <label>Order<input type="number" value={product.sortOrder} onChange={(event) => updateProductLocal(product.id, { sortOrder: Number(event.target.value) })} /></label>
                </div>
                <div className={styles.checks}>
                  <label><input type="checkbox" checked={product.available} onChange={(event) => updateProductLocal(product.id, { available: event.target.checked })} /> Available</label>
                  <label><input type="checkbox" checked={product.featured} onChange={(event) => updateProductLocal(product.id, { featured: event.target.checked })} /> Featured</label>
                </div>
                <button disabled={busy} type="button" onClick={() => void saveProduct(product)}>Save product</button>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'settings' && (
        <section className={styles.section}>
          <h2>Business settings</h2>
          <form className={`${styles.form} ${styles.settingsForm}`} onSubmit={saveSettings}>
            <label>Business name<input value={dashboard.settings.businessName} onChange={(event) => updateSettingsLocal({ businessName: event.target.value })} /></label>
            <label>Tagline<input value={dashboard.settings.tagline} onChange={(event) => updateSettingsLocal({ tagline: event.target.value })} /></label>
            <label>WhatsApp number<input value={dashboard.settings.whatsappNumber} onChange={(event) => updateSettingsLocal({ whatsappNumber: event.target.value })} /></label>
            <div className={styles.inlineFields}>
              <label>Minimum order<input type="number" min="1" value={dashboard.settings.minimumOrder} onChange={(event) => updateSettingsLocal({ minimumOrder: Number(event.target.value) })} /></label>
              <label>Deposit %<input type="number" min="0" max="100" value={dashboard.settings.depositPercentage} onChange={(event) => updateSettingsLocal({ depositPercentage: Number(event.target.value) })} /></label>
              <label>Delivery fee (R)<input type="number" min="0" step="0.01" value={dashboard.settings.deliveryFee} onChange={(event) => updateSettingsLocal({ deliveryFee: Number(event.target.value) })} /></label>
            </div>
            <label className={styles.checkboxLine}><input type="checkbox" checked={dashboard.settings.chatbotEnabled} onChange={(event) => updateSettingsLocal({ chatbotEnabled: event.target.checked })} /> Chatbot enabled</label>
            <button disabled={busy} type="submit">{busy ? 'Saving…' : 'Save settings'}</button>
          </form>
        </section>
      )}
    </main>
  )
}
