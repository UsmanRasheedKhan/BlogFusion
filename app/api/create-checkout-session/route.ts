import { NextResponse } from 'next/server';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-31.basil',
});

// Define the price IDs mapping with validation
const PRICE_IDS = {
  'basic': process.env.STRIPE_BASIC_PRICE_ID,
  'medium': process.env.STRIPE_MEDIUM_PRICE_ID,
  'premium': process.env.STRIPE_PREMIUM_PRICE_ID
} as const;

// Add validation at startup
Object.entries(PRICE_IDS).forEach(([plan, priceId]) => {
  if (!priceId) {
    console.error(`Missing Stripe price ID for plan: ${plan}`);
  }
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plan, userId, userEmail } = body;

    // Log received data for debugging
    console.log('Received plan:', plan);
    console.log('Available price IDs:', PRICE_IDS);
    console.log('Received userId:', userId);
    console.log('Received userEmail:', userEmail);
    console.log('Environment NEXT_PUBLIC_BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL);
    console.log('Environment STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'SET' : 'NOT SET');
    console.log('Environment STRIPE_BASIC_PRICE_ID:', process.env.STRIPE_BASIC_PRICE_ID);
    console.log('Environment STRIPE_MEDIUM_PRICE_ID:', process.env.STRIPE_MEDIUM_PRICE_ID);
    console.log('Environment STRIPE_PREMIUM_PRICE_ID:', process.env.STRIPE_PREMIUM_PRICE_ID);

    // Normalize and validate the plan name
    const normalizedPlan = plan.toLowerCase();
    const priceId = PRICE_IDS[normalizedPlan as keyof typeof PRICE_IDS];

    console.log('Normalized plan:', normalizedPlan);
    console.log('Selected priceId:', priceId);

    if (!priceId) {
      console.error(`Invalid plan or missing price ID for plan: ${normalizedPlan}`);
      return NextResponse.json({
        error: `Invalid plan or missing price ID for plan: ${normalizedPlan}`,
        details: 'Please check environment variables'
      }, { status: 400 });
    }

    // Create Stripe checkout session
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/`,
        customer_email: userEmail,
        metadata: {
          userId,
          plan: normalizedPlan
        },
      });
      console.log('Stripe session created:', session);
      const response = { sessionId: session.id };
      console.log('API response:', response, 'Status:', 200);
      return NextResponse.json(response);
    } catch (stripeError: any) {
      console.error('Stripe session creation error:', stripeError);
      return NextResponse.json(
        { error: stripeError.message || 'Failed to create checkout session' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Stripe API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}