import React, { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { AppStep, OrderState, ImageAnalysisResult, CustomerDetails, VideoTemplate } from './types';
import { StepIndicator } from './components/StepIndicator';
import { TemplateSelection } from './components/TemplateSelection';
import { PhotoUpload } from './components/PhotoUpload';
import { OrderSummary } from './components/OrderSummary';
import { Sparkles, CheckCircle2, RefreshCw, Loader2 } from 'lucide-react';
import { saveOrderToDatabase } from './services/dbService';
import { getStripe } from './services/paymentService';

const INITIAL_DETAILS: CustomerDetails = {
  childName: '',
  age: '5',
  gender: 'Boy',
  email: '',
  countryCode: '+1',
  whatsappNumber: '',
  consent: false
};

const INITIAL_ORDER_STATE: OrderState = {
  selectedTemplateId: null,
  uploadedImage: null,
  imageAnalysis: null,
  generatedPreview: null,
  details: INITIAL_DETAILS,
  selectedPricingTier: 'standard',
  stylePrompt: null,
  voucherCode: undefined,
  paymentStatus: 'pending',
  finalAmount: 0
};

// ----------------------------------------------------------------------------------
// TEMPLATE CONFIGURATION
// To show the correct thumbnail:
// 1. Upload your image (jpg/png) to your Supabase 'images' or 'videos' bucket.
// 2. Get the "Public URL" of the image.
// 3. Paste it into the `thumbnailUrl` field below.
// ----------------------------------------------------------------------------------
const INITIAL_TEMPLATES: VideoTemplate[] = [
  {
    id: 't1',
    title: 'The Lantern of Courage',
    description: 'A young boy and his fox companion brave a frozen mountain to discover that true strength comes from within.',
    thumbnailUrl: 'https://jqumzwyikbfbytfbafjm.supabase.co/storage/v1/object/public/images/Milo%20and%20Kida%20thumnail.png', // <--- REPLACE THIS WITH YOUR SUPABASE IMAGE URL
    previewVideoUrl: 'https://jqumzwyikbfbytfbafjm.supabase.co/storage/v1/object/public/videos/Milo%20and%20Kita%20lower%20bit%20rate.mp4',
    duration: '1:33',
    tags: ['Nature', 'Adventure', 'Mystery', '5-10 years'],
    stylePrompt: 'soft 3D animated movie style, warm lighting, detailed texture, cute character design'
  }
];

function App() {
  const [step, setStep] = useState<AppStep>(AppStep.TEMPLATE_SELECTION);
  const [order, setOrder] = useState<OrderState>(INITIAL_ORDER_STATE);
  const [templates, setTemplates] = useState<VideoTemplate[]>(INITIAL_TEMPLATES);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  useEffect(() => {
    // Check for Stripe success return
    const query = new URLSearchParams(window.location.search);
    if (query.get('success')) {
      // Check for saved email in localStorage to display in success message
      const savedEmail = localStorage.getItem('customer_email');

      if (savedEmail) {
        setOrder(prev => ({
          ...prev,
          details: { ...prev.details, email: savedEmail }
        }));
        // Clean up
        localStorage.removeItem('customer_email');
      }

      setStep(AppStep.SUCCESS);
      // Optional: Clear the query string to prevent success state on reload
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleTemplateSelect = (id: string) => {
    setOrder(prev => ({ ...prev, selectedTemplateId: id }));
  };

  const handleImageUpload = (image: string, analysis: ImageAnalysisResult) => {
    setOrder(prev => ({ ...prev, uploadedImage: image, imageAnalysis: analysis }));
  };

  const handlePreviewGenerated = (previewImage: string) => {
    setOrder(prev => ({ ...prev, generatedPreview: previewImage }));
  };

  const handleDetailsChange = (details: CustomerDetails) => {
    setOrder(prev => ({ ...prev, details }));
  };

  const handlePricingSelect = (tier: 'standard' | 'extended') => {
    setOrder(prev => ({ ...prev, selectedPricingTier: tier }));
  };

  const handlePersonalizationSubmit = (finalStyle: string) => {
    // Save the style used for generation
    setOrder(prev => ({ ...prev, stylePrompt: finalStyle }));
    setStep(AppStep.ORDER_SUMMARY);
  };

  const handleCheckout = async (voucherCode: string | undefined, finalAmount: number, paymentMethod: 'credit_card' | 'voucher', paymentIntentId?: string) => {
    setIsProcessingOrder(true);

    // Prepare the final order object with payment details
    const finalOrder: OrderState = {
      ...order,
      voucherCode,
      paymentStatus: finalAmount === 0 ? 'voucher_free' : 'paid',
      paymentMethod,
      finalAmount,
      paymentIntentId
    };

    setOrder(finalOrder);

    try {
      // Save to Database
      await saveOrderToDatabase(finalOrder);
      setStep(AppStep.SUCCESS);
    } catch (error) {
      console.error(error);
      alert("There was an error processing your order. Please try again.");
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const resetApp = () => {
    setStep(AppStep.TEMPLATE_SELECTION);
    setOrder(INITIAL_ORDER_STATE);
  };

  const getSelectedTemplate = () => templates.find(t => t.id === order.selectedTemplateId);

  const renderContent = () => {
    if (isProcessingOrder) {
      return (
        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
          <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center">
            <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-4" />
            <h3 className="text-xl font-bold text-slate-900">Processing Payment...</h3>
            <p className="text-slate-500 mt-2 text-center max-w-xs">
              Securely processing your request and creating your order.
            </p>
          </div>
        </div>
      );
    }

    switch (step) {
      case AppStep.TEMPLATE_SELECTION:
        return (
          <>
            <TemplateSelection
              templates={templates}
              selectedId={order.selectedTemplateId}
              onSelect={handleTemplateSelect}
            />
            <div className="mt-8 flex justify-end">
              <button
                disabled={!order.selectedTemplateId}
                onClick={() => setStep(AppStep.PHOTO_UPLOAD)}
                className={`px-8 py-3 rounded-full font-bold shadow-lg transition-all ${order.selectedTemplateId
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
              >
                Next Step
              </button>
            </div>
          </>
        );

      case AppStep.PHOTO_UPLOAD:
        return (
          <>
            <PhotoUpload
              template={getSelectedTemplate()}
              uploadedImage={order.uploadedImage}
              analysis={order.imageAnalysis}
              details={order.details}
              selectedPricingTier={order.selectedPricingTier}
              generatedPreview={order.generatedPreview}
              onPricingSelect={handlePricingSelect}
              onImageUpload={handleImageUpload}
              onPreviewGenerated={handlePreviewGenerated}
              onDetailsChange={handleDetailsChange}
              onClear={() => setOrder(prev => ({ ...prev, uploadedImage: null, imageAnalysis: null, generatedPreview: null }))}
              onSubmit={handlePersonalizationSubmit}
            />
            <div className="mt-8 flex justify-start">
              <button
                onClick={() => setStep(AppStep.TEMPLATE_SELECTION)}
                className="px-6 py-2 rounded-full border border-slate-300 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
            </div>
          </>
        );

      case AppStep.ORDER_SUMMARY:
        const selectedTemplate = getSelectedTemplate();
        if (!selectedTemplate || !order.uploadedImage) return null;

        return (
          <OrderSummary
            template={selectedTemplate}
            uploadedImage={order.uploadedImage}
            generatedPreview={order.generatedPreview}
            details={order.details}
            pricingTier={order.selectedPricingTier}
            onCheckout={handleCheckout}
            onEdit={() => setStep(AppStep.PHOTO_UPLOAD)}
          />
        );

      case AppStep.SUCCESS:
        return (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-4xl font-extrabold text-indigo-900 mb-4">Order Confirmed!</h2>
            <p className="text-xl text-slate-600 max-w-lg mx-auto mb-8">
              Thank you for choosing ToonStar! We have safely stored your details and the character design.
              <br /><br />
              You will receive the download link at <span className="font-semibold text-indigo-700">{order.details.email}</span> within 24 hours.
            </p>
            <button
              onClick={resetApp}
              className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 transition-colors shadow-lg"
            >
              <RefreshCw className="w-5 h-5" />
              Create Another Story
            </button>
          </div>
        )

      default:
        return null;
    }
  };

  const stripePromise = getStripe();

  return (
    <Elements stripe={stripePromise}>
      <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
        {/* Header */}
        <header className="bg-white border-b border-indigo-100 shadow-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={resetApp}>
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                ToonStar
              </h1>
            </div>
            <div className="text-sm font-semibold text-indigo-900 bg-indigo-50 px-3 py-1.5 rounded-full hidden sm:block">
              Personalized AI Cartoon Videos
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
          {step !== AppStep.SUCCESS && !isProcessingOrder && <StepIndicator currentStep={step} />}

          <div className="transition-all duration-500 ease-in-out">
            {renderContent()}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 mt-auto">
          <div className="max-w-6xl mx-auto px-4 py-6 text-center text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} ToonStar. All rights reserved. <br />
            <span className="text-xs">Secure Payments • Satisfaction Guaranteed</span>
          </div>
        </footer>
      </div>
    </Elements>
  );
}

export default App;