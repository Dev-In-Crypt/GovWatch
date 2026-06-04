import { NextResponse } from 'next/server';
import { auth } from '@/server/auth';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { stripe, PRICE_IDS } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!stripe) return NextResponse.json({ error: 'stripe not configured' }, { status: 500 });
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { plan } = (await req.json()) as { plan: 'delegate_pro' | 'fund_suite' };
  const priceId = PRICE_IDS[plan];
  if (!priceId) return NextResponse.json({ error: 'invalid plan' }, { status: 400 });

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return NextResponse.json({ error: 'user not found' }, { status: 404 });

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const c = await stripe.customers.create({ email, metadata: { userId: user.id } });
    customerId = c.id;
    await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, user.id));
  }

  const checkout = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${process.env.NEXTAUTH_URL}/settings?checkout=success`,
    cancel_url: `${process.env.NEXTAUTH_URL}/pricing?checkout=cancelled`,
    metadata: { userId: user.id, plan },
  });

  return NextResponse.json({ url: checkout.url });
}
