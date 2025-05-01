import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '../../firebase/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    const buf = await req.arrayBuffer();
    const text = Buffer.from(buf).toString();
    event = stripe.webhooks.constructEvent(text, sig!, webhookSecret!);
  } catch (err: any) {
    console.error('Webhook signature verification failed.', err.message);
    return NextResponse.json({ error: 'Webhook Error: ' + err.message }, { status: 400 });
  }

  // Handle the event
  if (event.type === 'checkout.session.completed' || event.type === 'customer.subscription.updated') {
    let userId: string | undefined;
    let plan: string | undefined;

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      userId = session.metadata?.userId;
      plan = session.metadata?.plan;
    } else if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      // You may need to fetch the Checkout Session to get metadata, or store mapping in your DB
      // For now, we only handle checkout.session.completed for plan upgrades
    }

    if (userId && plan) {
      try {
        const userRef = doc(db, 'users', userId);
        const updateData: any = { plan };
        if (plan === 'medium' || plan === 'premium') {
          updateData.publishedBlogs = 0;
          const expiry = new Date();
          expiry.setMonth(expiry.getMonth() + 1);
          updateData.planExpiry = expiry.toISOString();
        }
        await updateDoc(userRef, updateData);
        console.log(`User ${userId} upgraded to ${plan}`);
      } catch (err) {
        console.error('Error updating user plan in Firestore:', err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
