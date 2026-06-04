import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CheckoutButton } from '@/components/CheckoutButton';

export default function PricingPage() {
  return (
    <>
      <Header />
      <main className="container-mc" style={{ paddingTop: 140, paddingBottom: 80 }}>
        <div className="sec-head center">
          <span className="eyebrow" style={{ justifyContent: 'center' }}>
            Pricing
          </span>
          <h2>Free for everyone. Premium for pros.</h2>
          <p>
            The watchdog product is and always will be free. Premium adds real-time delivery and
            cross-DAO portfolio tools.
          </p>
        </div>

        <div className="price-grid">
          <div className="price-card">
            <div className="price-name">Observer</div>
            <div className="price-amt">
              $0<span className="per">/forever</span>
            </div>
            <div className="price-desc">Watch the universe. Public dashboards for everyone.</div>
            <Link
              href="/dashboard"
              className="btn-mc btn-mc-ghost"
              style={{ justifyContent: 'center', width: '100%' }}
            >
              Get started
            </Link>
            <ul className="price-feats">
              <li><span className="ck">✓</span>5 DAOs on your watchlist</li>
              <li><span className="ck">✓</span>Weekly Democracy Score digest</li>
              <li><span className="ck">✓</span>Public proposal feed + AI summaries</li>
              <li className="muted"><span className="ck">○</span>Real-time alerts</li>
              <li className="muted"><span className="ck">○</span>API access</li>
            </ul>
          </div>

          <div className="price-card pop">
            <span className="pill price-badge">Most popular</span>
            <div className="price-name">Delegate Pro</div>
            <div className="price-amt">
              $99<span className="per">/month</span>
            </div>
            <div className="price-desc">For delegates and researchers who act on the data.</div>
            <CheckoutButton plan="delegate_pro" />
            <ul className="price-feats">
              <li><span className="ck">✓</span>Unlimited DAO watchlist</li>
              <li><span className="ck">✓</span>Real-time whale alerts</li>
              <li><span className="ck">✓</span>Telegram · Discord · webhook</li>
              <li><span className="ck">✓</span>Coordinated voting detection</li>
              <li><span className="ck">✓</span>API · 1,000 calls/mo</li>
            </ul>
          </div>

          <div className="price-card">
            <div className="price-name">Fund Suite</div>
            <div className="price-amt">
              $399<span className="per">/month</span>
            </div>
            <div className="price-desc">For foundations, funds, and protocol teams.</div>
            <CheckoutButton plan="fund_suite" />
            <ul className="price-feats">
              <li><span className="ck">✓</span>Everything in Delegate Pro</li>
              <li><span className="ck">✓</span>Portfolio governance dashboard</li>
              <li><span className="ck">✓</span>Voting power simulation</li>
              <li><span className="ck">✓</span>API · 10,000 calls/mo</li>
              <li><span className="ck">✓</span>Dedicated governance analyst</li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
