export enum AppStep {
  TEMPLATE_SELECTION = 'TEMPLATE_SELECTION',
  PHOTO_UPLOAD = 'PHOTO_UPLOAD',
  ORDER_SUMMARY = 'ORDER_SUMMARY',
  SUCCESS = 'SUCCESS',
}

export interface VideoTemplate {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  previewVideoUrl: string;
  duration: string;
  tags?: string[];
  stylePrompt?: string;
}

export interface ImageAnalysisResult {
  isValid: boolean;
  faceCount: number;
  isClear: boolean;
  lighting: 'POOR' | 'GOOD' | 'EXCELLENT';
  feedback: string;
  score: number;
}

export interface CustomerDetails {
  childName: string;
  age: string;
  gender: string;
  email: string;
  countryCode: string;
  whatsappNumber: string;
  consent: boolean;
}

export interface OrderState {
  selectedTemplateId: string | null;
  uploadedImage: string | null; // Base64
  imageAnalysis: ImageAnalysisResult | null;
  generatedPreview: string | null; // Base64 of generated character
  details: CustomerDetails;
  selectedPricingTier: 'standard' | 'extended';
  stylePrompt: string | null; // The specific art style used
  // Payment fields
  voucherCode?: string;
  paymentStatus?: 'paid' | 'voucher_free' | 'pending';
  paymentMethod?: 'credit_card' | 'voucher';
  finalAmount?: number;
  paymentIntentId?: string; // Stripe payment intent ID
}