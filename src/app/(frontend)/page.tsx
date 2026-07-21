import Image from 'next/image'

import { ChatWidget } from '@/components/chat-widget'
import { OrderForm } from '@/components/order-form'
import { ProductMenu } from '@/components/product-menu'
import { BUSINESS_DETAILS, SITE_URL } from '@/lib/business'

const gallery = [
  'image1.jpeg',
  'image2.jpeg',
  'image3.jpeg',
  'image4.jpeg',
  'image5.jpeg',
  'image6.jpeg',
  'image7.jpeg',
  'image8.jpeg',
  'image9.jpeg',
  'image10.jpeg',
]

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Bakery',
      '@id': `${SITE_URL}/#business`,
      name: BUSINESS_DETAILS.name,
      url: SITE_URL,
      image: `${SITE_URL}/images/main-picture.jpeg`,
      description: 'Luxury dessert cups with premium flavours and elegant presentation for celebrations and events.',
      telephone: `+${BUSINESS_DETAILS.whatsappNumber}`,
      priceRange: 'R20-R30',
      servesCuisine: 'Desserts',
      menu: `${SITE_URL}/#menu`,
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is the minimum Luxe Bites order?',
          acceptedAnswer: { '@type': 'Answer', text: `The minimum order is ${BUSINESS_DETAILS.minimumOrder} desserts.` },
        },
        {
          '@type': 'Question',
          name: 'Is a deposit required?',
          acceptedAnswer: { '@type': 'Answer', text: `A ${BUSINESS_DETAILS.depositPercentage}% deposit is required after Sam confirms the order.` },
        },
        {
          '@type': 'Question',
          name: 'Can Luxe Bites orders be delivered?',
          acceptedAnswer: { '@type': 'Answer', text: `Delivery is available for R${BUSINESS_DETAILS.deliveryFee}, and collection is also available. Sam confirms the final details.` },
        },
      ],
    },
  ],
}

export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>

      <div className="video-bg" aria-hidden="true">
        <video autoPlay muted loop playsInline poster="/images/image5.jpeg">
          <source src="/videos/video1.mp4" type="video/mp4" />
        </video>
        <div className="overlay" />
      </div>

      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href="#main-content" aria-label="Luxe Bites home">
            <Image src="/images/logo.jpeg" width={52} height={52} alt="" priority />
            <div>
              <strong>Sammy’s Sweets</strong>
              <span>Luxe Bites</span>
            </div>
          </a>
          <nav aria-label="Primary navigation">
            <a href="#menu">Menu</a>
            <a href="#gallery">Gallery</a>
            <a href="#videos">Videos</a>
            <a href="#order" className="btn-nav">Order</a>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">Made for celebrations</span>
              <h1>Luxury dessert cups, beautifully made.</h1>
              <p>{BUSINESS_DETAILS.tagline}</p>
              <div className="hero-actions">
                <a href="#menu" className="btn-main">View menu</a>
                <a href="#order" className="btn-secondary">Build your order</a>
              </div>
              <div className="hero-facts" aria-label="Order information">
                <span>From R20</span>
                <span>{BUSINESS_DETAILS.minimumOrder} cup minimum</span>
                <span>{BUSINESS_DETAILS.depositPercentage}% deposit</span>
              </div>
            </div>
            <div className="hero-image-wrap">
              <Image
                src="/images/image5.jpeg"
                alt="Luxe Bites dessert cups presented for an event"
                fill
                sizes="(max-width: 900px) 100vw, 50vw"
                priority
              />
            </div>
          </div>
        </section>

        <section id="menu" className="section">
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">See every option</span>
              <h2>Choose desserts visually</h2>
              <p style={{ marginTop: 12, maxWidth: 680, color: '#d6cadb' }}>
                Each dessert now has its own picture, price and direct link into the itemised order builder.
              </p>
            </div>
            <ProductMenu />
          </div>
        </section>

        <section id="gallery" className="section section-tinted">
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">Made with care</span>
              <h2>Gallery</h2>
            </div>
            <div className="gallery">
              {gallery.map((image, index) => (
                <div className="gallery-item" key={image}>
                  <Image
                    src={`/images/${image}`}
                    alt={`Luxe Bites dessert presentation ${index + 1}`}
                    fill
                    sizes="(max-width: 620px) 100vw, (max-width: 980px) 50vw, 25vw"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section process-section" aria-labelledby="process-title">
          <div className="container">
            <div className="section-heading process-heading">
              <span className="eyebrow">Simple and clear</span>
              <h2 id="process-title">How ordering works</h2>
              <p>Your request is never treated as confirmed until Sam checks the details with you.</p>
            </div>
            <ol className="process-grid">
              <li>
                <span>01</span>
                <h3>Build an itemised order</h3>
                <p>Use the pictures and quantity controls to choose each dessert clearly.</p>
              </li>
              <li>
                <span>02</span>
                <h3>Review the estimate</h3>
                <p>See quantities, dessert subtotal, delivery estimate and your current total before sending.</p>
              </li>
              <li>
                <span>03</span>
                <h3>Confirm and pay safely</h3>
                <p>Sam confirms availability and sends verified details for the {BUSINESS_DETAILS.depositPercentage}% deposit.</p>
              </li>
            </ol>
          </div>
        </section>

        <section id="videos" className="section">
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">See the details</span>
              <h2>Luxe Bites in motion</h2>
            </div>
            <div className="videos">
              <video controls preload="metadata" playsInline poster="/images/image1.jpeg">
                <source src="/videos/video1.mp4" type="video/mp4" />
              </video>
              <video controls preload="metadata" playsInline poster="/images/image11.jpeg">
                <source src="/videos/video2.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </section>

        <section id="order" className="section order-section">
          <div className="container order-grid">
            <div className="order-copy">
              <Image src="/images/logo.jpeg" width={92} height={72} alt="Luxe Bites logo" />
              <span className="eyebrow">Visual order builder</span>
              <h2>Choose, review, then confirm.</h2>
              <p>Select exact desserts and quantities, review the estimate, and send Sam a clean itemised request. Payment only happens after Sam confirms the order and sends verified details.</p>
              <a
                className="whatsapp-inline"
                href={`https://wa.me/${BUSINESS_DETAILS.whatsappNumber}`}
                target="_blank"
                rel="noreferrer"
              >
                Ask Sam on WhatsApp
              </a>
            </div>
            <OrderForm />
          </div>
        </section>

        <section className="section faq-section" aria-labelledby="faq-title">
          <div className="container faq-grid">
            <div className="section-heading">
              <span className="eyebrow">Before you order</span>
              <h2 id="faq-title">Quick answers</h2>
            </div>
            <div className="faq-list">
              <details>
                <summary>What is the minimum order?</summary>
                <p>The minimum is {BUSINESS_DETAILS.minimumOrder} desserts. The order builder counts them for you.</p>
              </details>
              <details>
                <summary>How much is the deposit?</summary>
                <p>A {BUSINESS_DETAILS.depositPercentage}% deposit is required after Sam confirms the order details.</p>
              </details>
              <details>
                <summary>How do I pay?</summary>
                <p>Send the request first. Sam confirms the final total and then sends verified payment details. Never enter banking or card details into the website form.</p>
              </details>
              <details>
                <summary>Do you deliver?</summary>
                <p>Delivery is R{BUSINESS_DETAILS.deliveryFee}. Collection is also available; Sam confirms the final arrangements.</p>
              </details>
              <details>
                <summary>What about allergens or availability?</summary>
                <p>Please ask Sam directly. The website and AI assistant do not guess ingredients, allergens, or live availability.</p>
              </details>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div>
            <strong>{BUSINESS_DETAILS.name}</strong>
            <p>Luxury dessert cups for celebrations and events.</p>
          </div>
          <div className="footer-links">
            <a href="#menu">Menu</a>
            <a href="#order">Build an order</a>
            <a href={`https://wa.me/${BUSINESS_DETAILS.whatsappNumber}`} target="_blank" rel="noreferrer">WhatsApp</a>
          </div>
        </div>
      </footer>

      <a
        href={`https://wa.me/${BUSINESS_DETAILS.whatsappNumber}`}
        target="_blank"
        rel="noreferrer"
        className="whatsapp"
        aria-label="Contact Luxe Bites on WhatsApp"
      >
        WhatsApp
      </a>

      <ChatWidget />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  )
}
