import { loadStripe, Stripe } from '@stripe/stripe-js';

// Initialize Stripe
let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = () => {
    if (!stripePromise) {
        const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

        if (!publishableKey) {
            console.warn('⚠️ Stripe publishable key is missing. Please set VITE_STRIPE_PUBLISHABLE_KEY in your .env.local file');
            console.warn('Payment processing will not be available until you add your Stripe key.');
            return null;
        }

        stripePromise = loadStripe(publishableKey);
    }
    return stripePromise;
};

// Create a payment intent (this would normally be done on the backend)
// For now, we'll simulate this client-side for MVP
export const createPaymentIntent = async (amount: number): Promise<{ clientSecret: string } | null> => {
    // IMPORTANT: In production, this should be done on your backend server
    // For now, we'll return a mock response to demonstrate the flow

    console.warn('⚠️ Payment Intent creation should be done on the backend in production!');

    // In a real implementation, you would call your backend API:
    // const response = await fetch('/api/create-payment-intent', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ amount: Math.round(amount * 100) }) // Convert to cents
    // });
    // const data = await response.json();
    // return { clientSecret: data.clientSecret };

    console.warn('⚠️ [Payment Mock] Payment Intent creation is being SIMULATED.');
    console.warn('⚠️ [Payment Mock] No request is sent to Stripe backend API.');
    console.warn('⚠️ [Payment Mock] This is why you DO NOT see a transaction in Stripe Dashboard.');

    // For MVP/demo purposes, we'll skip the actual payment processing
    // and just simulate success
    return null;
};

export interface PaymentResult {
    success: boolean;
    paymentIntentId?: string;
    error?: string;
}

export const processStripePayment = async (
    stripe: Stripe,
    elements: any,
    amount: number,
    customerEmail: string
): Promise<PaymentResult> => {
    try {
        // In production, you would:
        // 1. Create payment intent on backend
        // 2. Confirm the payment with Stripe
        // 3. Verify payment on backend before saving order

        // For MVP demo, we'll simulate a successful payment
        console.log('Processing payment for amount:', amount);
        console.log('Customer email:', customerEmail);

        // Simulate payment processing
        return {
            success: true,
            paymentIntentId: `pi_demo_${Date.now()}`
        };

    } catch (error: any) {
        console.error('Payment processing error:', error);
        return {
            success: false,
            error: error.message || 'Payment failed. Please try again.'
        };
    }
};

export class StripePaymentConfig {
    private static links = {
        test: {
            standard: 'https://buy.stripe.com/test_cNieV50RDeNm9Jgf9D5EY00',
            extended: 'https://buy.stripe.com/test_14AdR19o96gQf3A7Hb5EY01'
        },
        production: {
            // TODO: Update these with real production links when ready
            standard: 'https://buy.stripe.com/8x26ozgVg0aw1GS8KX8N200',
            extended: 'https://buy.stripe.com/fZu7sDfRc6yU71caT58N201'
        }
    };

    static getPaymentLink(tier: 'standard' | 'extended', isTestMode: boolean = true, email?: string): string {
        const mode = isTestMode ? 'test' : 'production';
        let link = this.links[mode][tier];

        if (email) {
            const separator = link.includes('?') ? '&' : '?';
            link += `${separator}prefilled_email=${encodeURIComponent(email)}`;
        }

        return link;
    }
}
