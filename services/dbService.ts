import { createClient } from '@supabase/supabase-js';
import { OrderState } from '../types';

/**
 * DB SERVICE - SUPABASE IMPLEMENTATION
 */

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------
// Use import.meta.env for Vite production, fallback to process.env
// @ts-ignore
const getEnv = (key: string) => import.meta.env[key] || process.env[key.replace('VITE_', '')];

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || 'https://jqumzwyikbfbytfbafjm.supabase.co'; 
const SUPABASE_KEY = getEnv('VITE_SUPABASE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxdW16d3lpa2JmYnl0ZmJhZmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwODMxOTksImV4cCI6MjA4NjY1OTE5OX0.6YT4Umg-cr2APML-9bcZ7ZPTv5xPAZVT4-lYrZbW-ew';    

// Initialize Supabase Client
if (SUPABASE_URL.includes('YOUR_SUPABASE') || SUPABASE_KEY.includes('YOUR_SUPABASE')) {
    console.warn("⚠️ SUPABASE CREDENTIALS NOT SET. Please update services/dbService.ts");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export interface SavedOrder extends OrderState {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt: string;
    totalAmount: number;
}

// Helper: Convert Base64 to Blob for upload
const base64ToBlob = (base64: string): Blob => {
    try {
        // Handle cases where the prefix might be missing or different
        const arr = base64.split(',');
        const dataStr = arr.length > 1 ? arr[1] : arr[0];
        
        // Guess mime type if possible, otherwise default to jpeg
        let mime = 'image/jpeg';
        if (arr.length > 1) {
            const match = arr[0].match(/:(.*?);/);
            if (match) mime = match[1];
        }

        const raw = atob(dataStr);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);

        for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }

        return new Blob([uInt8Array], { type: mime });
    } catch (e) {
        console.error("Error converting base64 to blob", e);
        throw new Error("Failed to process image data.");
    }
};

// Helper: Upload file to Supabase Storage
const uploadImageToSupabase = async (base64Data: string, folder: string): Promise<string> => {
    try {
        if (!base64Data) throw new Error("No image data provided");
        
        const blob = base64ToBlob(base64Data);
        // Generate a clean filename
        const ext = blob.type.split('/')[1] || 'jpg';
        const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

        const { data, error } = await supabase.storage
            .from('images') // Ensure you created a public bucket named 'images'
            .upload(fileName, blob, {
                contentType: blob.type,
                upsert: false
            });

        if (error) {
            console.error("Supabase Upload Error:", error);
            // CRITICAL: We throw here so the order is NOT created if upload fails (e.g. RLS policy error)
            throw new Error(`Image upload failed: ${error.message}. Check Storage Policies.`);
        }

        // Get Public URL
        const { data: publicUrlData } = supabase.storage
            .from('images')
            .getPublicUrl(fileName);

        return publicUrlData.publicUrl;
    } catch (err: any) {
        console.error("Failed to upload image:", err);
        throw err; // Re-throw to stop execution
    }
};

// --- COUPON LOGIC ---

export const validateVoucher = async (code: string): Promise<{ valid: boolean; discountPercent: number; message: string }> => {
    if (SUPABASE_URL.includes('YOUR_SUPABASE')) {
        // Fallback for demo if DB isn't connected
        if (code === 'TOONSTAR100') return { valid: true, discountPercent: 100, message: 'Code Applied!' };
        return { valid: false, discountPercent: 0, message: 'Database not connected' };
    }

    try {
        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', code)
            .single();

        if (error || !data) {
            return { valid: false, discountPercent: 0, message: 'Invalid voucher code.' };
        }

        if (data.times_used >= data.usage_limit) {
            return { valid: false, discountPercent: 0, message: 'This voucher has already been used.' };
        }

        return { valid: true, discountPercent: data.discount_percent, message: 'Voucher applied successfully!' };

    } catch (err) {
        console.error("Voucher check error", err);
        return { valid: false, discountPercent: 0, message: 'Error checking voucher.' };
    }
};

const incrementVoucherUsage = async (code: string) => {
    try {
        // First get current count
        const { data } = await supabase.from('coupons').select('times_used').eq('code', code).single();
        
        if (data) {
            await supabase
                .from('coupons')
                .update({ times_used: data.times_used + 1 })
                .eq('code', code);
        }
    } catch (err) {
        console.error("Failed to increment voucher usage", err);
    }
};

// --- ORDER LOGIC ---

export const saveOrderToDatabase = async (order: OrderState): Promise<SavedOrder> => {
    console.log("Processing order for Supabase...");

    // Basic validation
    if (SUPABASE_URL.includes('YOUR_SUPABASE')) {
        alert("Please configure Supabase Keys in services/dbService.ts");
        throw new Error("Supabase not configured");
    }

    try {
        // 1. Upload Images (Parallel uploads for speed)
        // We ensure we have the URLs before creating the database row.
        const uploadPromises = [];
        
        if (order.uploadedImage) {
            uploadPromises.push(uploadImageToSupabase(order.uploadedImage, 'originals'));
        } else {
            uploadPromises.push(Promise.reject(new Error("Missing uploaded image")));
        }

        if (order.generatedPreview) {
            uploadPromises.push(uploadImageToSupabase(order.generatedPreview, 'generated'));
        } else {
            // It's okay if preview is missing (rare case), but usually it exists.
            // We pass a dummy resolved promise to keep array alignment if needed, or just allow null.
            uploadPromises.push(Promise.resolve(null)); 
        }

        const [originalImageUrl, generatedImageUrl] = await Promise.all(uploadPromises);

        // 2. Insert into Database
        const { data, error } = await supabase
            .from('orders')
            .insert([
                {
                    child_name: order.details.childName,
                    child_age: order.details.age,
                    child_gender: order.details.gender,
                    customer_email: order.details.email,
                    whatsapp: order.details.whatsappNumber ? `${order.details.countryCode} ${order.details.whatsappNumber}` : null,
                    template_id: order.selectedTemplateId,
                    pricing_tier: order.selectedPricingTier,
                    style_prompt: order.stylePrompt,
                    original_image_url: originalImageUrl,
                    generated_image_url: generatedImageUrl,
                    total_amount: order.finalAmount, // Use final amount (which might be 0)
                    status: 'pending',
                    // Payment fields
                    voucher_code: order.voucherCode || null,
                    payment_status: order.paymentStatus || 'pending',
                    payment_method: order.paymentMethod || 'unknown'
                }
            ])
            .select()
            .single();

        if (error) {
            throw error;
        }

        // 3. If a voucher was used successfully, increment its usage count
        if (order.voucherCode) {
            await incrementVoucherUsage(order.voucherCode);
        }

        console.log("Order saved to Supabase:", data);

        // Map back to SavedOrder type for frontend
        return {
            ...order,
            id: data.id,
            status: data.status,
            createdAt: data.created_at,
            totalAmount: Number(data.total_amount)
        };

    } catch (error: any) {
        console.error("Supabase Database Error:", error);
        throw new Error(error.message || "Failed to save order details to the database.");
    }
};

export const getOrderHistory = async (): Promise<SavedOrder[]> => {
    if (SUPABASE_URL.includes('YOUR_SUPABASE')) return [];

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching history:", error);
        return [];
    }

    return data.map((row: any) => ({
        selectedTemplateId: row.template_id,
        uploadedImage: row.original_image_url, 
        imageAnalysis: null,
        generatedPreview: row.generated_image_url, 
        details: {
            childName: row.child_name,
            age: row.child_age,
            gender: row.child_gender,
            email: row.customer_email,
            countryCode: '',
            whatsappNumber: row.whatsapp || '',
            consent: true
        },
        selectedPricingTier: row.pricing_tier as 'standard' | 'extended',
        stylePrompt: row.style_prompt,
        id: row.id,
        status: row.status,
        createdAt: row.created_at,
        totalAmount: Number(row.total_amount),
        voucherCode: row.voucher_code,
        paymentStatus: row.payment_status
    }));
};