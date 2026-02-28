import React, { useState } from 'react';
import { CustomerDetails, VideoTemplate } from '../types';
import { ShoppingBag, ArrowRight, ShieldCheck, Clock, Wand2, Ticket, CreditCard, Lock, Loader2 } from 'lucide-react';
import { validateVoucher } from '../services/dbService';
import { StripePaymentConfig } from '../services/paymentService';

interface Props {
    template: VideoTemplate;
    uploadedImage: string;
    generatedPreview: string | null;
    details: CustomerDetails;
    pricingTier: 'standard' | 'extended';
    onCheckout: (voucherCode: string | undefined, finalAmount: number, paymentMethod: 'credit_card' | 'voucher', paymentIntentId?: string) => void;
    onEdit: () => void;
}

export const OrderSummary: React.FC<Props> = ({ template, uploadedImage, generatedPreview, details, pricingTier, onCheckout, onEdit }) => {
    const basePrice = pricingTier === 'standard' ? 12.99 : 14.99;
    const duration = pricingTier === 'standard' ? '75 sec' : '120 sec';
    const planName = pricingTier === 'standard' ? 'Standard Clip' : 'Extended Adventure';

    // Payment State
    const [voucherInput, setVoucherInput] = useState('');
    const [appliedVoucher, setAppliedVoucher] = useState<string | null>(null);
    const [discount, setDiscount] = useState(0);
    const [voucherError, setVoucherError] = useState('');
    const [isVerifyingVoucher, setIsVerifyingVoucher] = useState(false);


    const finalPrice = Math.max(0, basePrice - discount);

    const handleApplyVoucher = async () => {
        const code = voucherInput.trim().toUpperCase();
        if (!code) return;

        setIsVerifyingVoucher(true);
        setVoucherError('');

        try {
            const result = await validateVoucher(code);

            if (result.valid) {
                setAppliedVoucher(code);
                // Calculate discount
                const discountAmount = (basePrice * result.discountPercent) / 100;
                setDiscount(discountAmount);
                setVoucherError('');
            } else {
                setVoucherError(result.message);
                setAppliedVoucher(null);
                setDiscount(0);
            }
        } catch (e) {
            setVoucherError("Error verifying code.");
        } finally {
            setIsVerifyingVoucher(false);
        }
    };

    const removeVoucher = () => {
        setAppliedVoucher(null);
        setDiscount(0);
        setVoucherInput('');
        setVoucherError('');
    };


    const handleFreeCheckout = () => {
        onCheckout(appliedVoucher || undefined, 0, 'voucher');
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-indigo-900 mb-2">Order Summary</h2>
                <p className="text-slate-600">Review your magical story package before checkout.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Col: Order Details */}
                <div className="lg:col-span-2 space-y-6">

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-semibold text-slate-700">Video Template</h3>
                            <button onClick={onEdit} className="text-indigo-600 text-sm hover:underline">Edit</button>
                        </div>
                        <div className="p-4 flex gap-4">
                            <img src={template.thumbnailUrl} alt="Template" className="w-24 h-16 object-cover rounded-lg shadow-sm" />
                            <div>
                                <h4 className="font-bold text-slate-900">{template.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">{planName}</span>
                                    <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {duration}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-semibold text-slate-700">Star of the Story</h3>
                            <button onClick={onEdit} className="text-indigo-600 text-sm hover:underline">Edit</button>
                        </div>
                        <div className="p-4">
                            <div className="flex gap-6 items-center mb-4">
                                <div className="flex -space-x-3">
                                    <div className="w-16 h-16 rounded-full border-2 border-white overflow-hidden shadow-md relative z-10">
                                        <img src={uploadedImage} alt="Child" className="w-full h-full object-cover" />
                                    </div>
                                    {generatedPreview && (
                                        <div className="w-16 h-16 rounded-full border-2 border-white overflow-hidden shadow-md relative z-20">
                                            <img src={generatedPreview} alt="Generated" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">{details.childName}</h4>
                                    <p className="text-sm text-slate-500">{details.age} years old • {details.gender}</p>
                                </div>
                            </div>
                            {generatedPreview && (
                                <div className="bg-indigo-50 rounded-lg p-3 flex items-start gap-2">
                                    <Wand2 className="w-4 h-4 text-indigo-600 mt-0.5" />
                                    <p className="text-xs text-indigo-800">
                                        Character style approved for "{template.title}".
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stripe Payment Redirect */}
                    {finalPrice > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6">
                            <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                                <CreditCard className="w-5 h-5" />
                                Payment
                            </h3>
                            <p className="text-sm text-slate-600 mb-6">
                                You will be redirected to a secure Stripe checkout page to complete your purchase of the <strong>{planName}</strong> package.
                            </p>

                            <button
                                onClick={() => {
                                    // Default to test mode for now as per instructions to make it work in sandbox
                                    // In production, you might want to switch this based on env vars
                                    const isTestMode = true;
                                    const link = StripePaymentConfig.getPaymentLink(pricingTier, isTestMode, details.email);

                                    // Save email to localStorage so we can display it on the success page after redirect
                                    localStorage.setItem('customer_email', details.email);

                                    window.location.href = link;
                                }}
                                className="w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30"
                            >
                                Proceed to Checkout <ArrowRight className="w-5 h-5" />
                            </button>

                            <div className="mt-4 flex items-center justify-center gap-2 text-slate-400 text-xs">
                                <Lock className="w-3 h-3" />
                                Secure Payment via Stripe
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Col: Price & Checkout */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 p-6 sticky top-8">
                        <h3 className="text-xl font-bold text-indigo-900 mb-6">Total</h3>

                        {/* Voucher Section */}
                        <div className="mb-6">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Have a voucher?</label>
                            {appliedVoucher ? (
                                <div className="flex items-center justify-between bg-green-50 text-green-700 px-3 py-2 rounded-lg border border-green-200">
                                    <div className="flex items-center gap-2">
                                        <Ticket className="w-4 h-4" />
                                        <span className="font-bold text-sm">{appliedVoucher}</span>
                                    </div>
                                    <button onClick={removeVoucher} className="text-xs underline hover:text-green-800">Remove</button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Code"
                                        value={voucherInput}
                                        onChange={(e) => setVoucherInput(e.target.value)}
                                        disabled={isVerifyingVoucher}
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                                    />
                                    <button
                                        onClick={handleApplyVoucher}
                                        disabled={isVerifyingVoucher || !voucherInput}
                                        className="px-3 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-700 disabled:opacity-50 flex items-center justify-center min-w-[70px]"
                                    >
                                        {isVerifyingVoucher ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                                    </button>
                                </div>
                            )}
                            {voucherError && <p className="text-red-500 text-xs mt-1">{voucherError}</p>}
                        </div>

                        <div className="space-y-3 mb-6 border-b border-slate-100 pb-6">
                            <div className="flex justify-between text-slate-600">
                                <span>Subtotal</span>
                                <span>${basePrice.toFixed(2)}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-green-600 font-medium">
                                    <span>Discount</span>
                                    <span>-${discount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-lg text-indigo-900 pt-2 border-t border-dashed border-slate-200">
                                <span>Total Due</span>
                                <span>${finalPrice.toFixed(2)}</span>
                            </div>
                        </div>

                        {finalPrice === 0 && (
                            <button
                                onClick={handleFreeCheckout}
                                className="w-full py-3.5 rounded-xl font-bold shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 shadow-green-500/30"
                            >
                                Place Free Order <ArrowRight className="w-5 h-5" />
                            </button>
                        )}

                        <div className="mt-4 flex items-center justify-center gap-2 text-slate-500 text-xs">
                            <ShieldCheck className="w-4 h-4" />
                            Secure SSL Checkout
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};