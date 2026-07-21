import Link from 'next/link'

const CMS_URL = 'https://supabase.com/dashboard/project/bpynafeivwkvhtgxmnfz/editor'

type AdminPageProps = {
  params: Promise<{ segments?: string[] }>
  searchParams: Promise<Record<string, string | string[]>>
}

export const metadata = {
  title: 'Luxe Bites Administration',
  robots: { index: false, follow: false },
}

export default function Page(_props: AdminPageProps) {
  return (
    <main style={{ maxWidth: 780, margin: '0 auto', padding: '10vh 24px 80px' }}>
      <p style={{ color: '#f1a7ce', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
        Luxe Bites administration
      </p>
      <h1 style={{ margin: '0 0 16px', fontSize: 'clamp(2.2rem, 7vw, 4.2rem)', lineHeight: 1 }}>
        Your backend CMS is ready.
      </h1>
      <p style={{ maxWidth: 650, color: '#d6cadb', fontSize: 18, lineHeight: 1.7 }}>
        Order requests are stored securely in Supabase. Open the CMS, choose the <strong style={{ color: '#fff' }}>luxe_bites</strong> schema, and manage orders, menu products, and business settings.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, margin: '32px 0' }}>
        {[
          ['Orders', 'Review customer details and move requests through each order status.'],
          ['Products', 'Change dessert names, prices, availability, featured items, and menu order.'],
          ['Site settings', 'Manage the minimum order, deposit, delivery fee, WhatsApp number, and chatbot setting.'],
        ].map(([title, description]) => (
          <section key={title} style={{ padding: 20, border: '1px solid #4d2a5f', borderRadius: 18, background: '#21102d' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>{title}</h2>
            <p style={{ margin: 0, color: '#cbbbd1', lineHeight: 1.55 }}>{description}</p>
          </section>
        ))}
      </div>

      <a
        href={CMS_URL}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'inline-block',
          padding: '14px 22px',
          borderRadius: 999,
          background: '#8c3fc2',
          color: '#fff',
          fontWeight: 800,
          textDecoration: 'none',
        }}
      >
        Open secure CMS
      </a>

      <p style={{ marginTop: 22, color: '#a996b1', lineHeight: 1.6 }}>
        Sign in with the Supabase account already connected to TK Web Studio. The Luxe Bites data is isolated from the portfolio in its own database schema.
      </p>

      <Link href="/" style={{ display: 'inline-block', marginTop: 12, color: '#f1a7ce', fontWeight: 700 }}>
        Return to the website
      </Link>
    </main>
  )
}
