import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe, PLAN_BY_PRICE } from '@/lib/stripe';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!stripe) return NextResponse.json({ error: 'stripe not configured' }, { status: 500 });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'no webhook secret' }, { status: 500 });

  const sig = (await headers()).get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'missing signature' }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error('stripe webhook bad signature', err);
    return NextResponse.json({ error: 'bad signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.metadata?.userId;
        if (userId && s.subscription) {
          const sub = await stripe.subscriptions.retrieve(s.subscription as string);
          const priceId = sub.items.data[0]?.price.id;
          const plan = priceId ? (PLAN_BY_PRICE[priceId] ?? 'delegate_pro') : 'delegate_pro';
          await db
            .update(users)
            .set({ plan, stripeSubscriptionId: sub.id })
            .where(eq(users.id, userId));
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        const priceId = sub.items.data[0]?.price.id;
        const plan =
          sub.status === 'active' && priceId
            ? (PLAN_BY_PRICE[priceId] ?? 'free')
            : 'free';
        await db
          .update(users)
          .set({ plan, stripeSubscriptionId: sub.id })
          .where(eq(users.stripeCustomerId, customerId));
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('stripe webhook handler failed', err);
    return NextResponse.json({ error: 'handler failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
