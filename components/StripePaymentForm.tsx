import React, { useState } from 'react';
import { StripeCardElement } from '@stripe/stripe-js';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Lock, Loader2 } from 'lucide-react';

interface Props {
    amount: number;
    customerEmail: string;
    onSuccess: (paymentIntentId: string) => void;
    onError: (error: string) => void;
}

const CARD_ELEMENT_OPTIONS = {
    style: {
        base: {
            fontSize: '16px',
            color: '#1e293b',
            '::placeholder': {
                color: '#94a3b8',
            },
            fontFamily: 'system-ui, -apple-system, sans-serif',
        },
        invalid: {
            color: '#ef4444',
        },
    },
};

export const StripePaymentForm: React.FC<Props> = ({ amount, customerEmail, onSuccess, onError }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [cardComplete, setCardComplete] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            onError('Stripe has not loaded yet. Please try again.');
            return;
        }

        const cardElement = elements.getElement(CardElement) as unknown as StripeCardElement;
        if (!cardElement) {
            console.error('❌ Card element not found in DOM');
            onError('Card element not found.');
            return;
        }

        setIsProcessing(true);
        console.log('🔄 Starting minimal Stripe payment flow...');

        try {
            // Create payment method
            console.log('💳 Creating Stripe Payment Method...');
            const result = await stripe.createPaymentMethod({
                type: 'card',
                card: cardElement,
                billing_details: {
                    email: customerEmail,
                },
            });

            if (result.error) {
                console.error('❌ Stripe Create Payment Method Error:', result.error);
                throw new Error(result.error.message);
            }

            const paymentMethod = result.paymentMethod;
            console.log('✅ Payment Method created successfully:', paymentMethod.id);
            console.log('ℹ️ NOTICE: This is a client-side only integration. No actual charge is created on Stripe because we lack a backend server.');

            // Simulate a small delay for realism
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Simulate successful payment
            const mockPaymentIntentId = `pi_demo_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            console.log('✅ Simulating payment success with ID:', mockPaymentIntentId);

            onSuccess(mockPaymentIntentId);

        } catch (error: any) {
            console.error('❌ Payment processing error:', error);
            onError(error.message || 'Payment failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> Payment Details
                    </h3>
                </div>
                <div className="p-6">
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
                        Card Information
                    </label>
                    <div className="border border-slate-300 rounded-lg p-3 focus-within:ring-2 focus-within:ring-indigo-200 focus-within:border-indigo-500 transition-all">
                        <CardElement
                            options={CARD_ELEMENT_OPTIONS}
                            onChange={(e) => setCardComplete(e.complete)}
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-2">
                        <Lock className="w-3 h-3" />
                        Your payment information is encrypted and secure
                    </p>

                    {/* Test card info for development */}
                    {import.meta.env.DEV && (
                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                            <strong>Test Mode:</strong> Use card 4242 4242 4242 4242, any future expiry, any CVC
                        </div>
                    )}
                </div>
            </div>

            <button
                type="submit"
                disabled={!stripe || isProcessing || !cardComplete}
                className={`w-full py-3.5 rounded-xl font-bold shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2
          ${isProcessing || !cardComplete
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/30'
                    }`}
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing Payment...
                    </>
                ) : (
                    <>Pay ${amount.toFixed(2)}</>
                )}
            </button>
        </form>
    );
};
