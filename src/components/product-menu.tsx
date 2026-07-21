import Image from 'next/image'

import { BUSINESS_DETAILS, MENU_ITEMS } from '@/lib/business'

import styles from './product-menu.module.css'

export function ProductMenu() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.grid}>
        {MENU_ITEMS.map((item) => (
          <article className={styles.card} key={item.name}>
            <div className={styles.imageWrap}>
              <Image
                src={item.image}
                alt={`${item.name} by Luxe Bites`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 980px) 50vw, 33vw"
              />
            </div>
            <div className={styles.cardBody}>
              <h3>{item.name}</h3>
              <strong>R{item.price} each</strong>
              <a href="#order">Add to order</a>
            </div>
          </article>
        ))}
      </div>

      <aside className={styles.rules} aria-label="Order information">
        <div><span>Minimum order</span><strong>{BUSINESS_DETAILS.minimumOrder} desserts</strong></div>
        <div><span>Deposit after confirmation</span><strong>{BUSINESS_DETAILS.depositPercentage}%</strong></div>
        <div><span>Delivery</span><strong>R{BUSINESS_DETAILS.deliveryFee}</strong></div>
        <div><span>Payment</span><strong>Verified details from Sam</strong></div>
      </aside>
    </div>
  )
}
