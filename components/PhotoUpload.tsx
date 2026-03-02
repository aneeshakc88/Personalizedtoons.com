import React, { useState, useRef } from 'react';
import { Upload, X, AlertCircle, CheckCircle, Loader2, Camera, User, Mail, Phone, Eye, Clock, Sparkles, Wand2, ArrowRight, Palette } from 'lucide-react';
import { analyzeImage, generateCharacterPreview } from '../services/geminiService';
import { ImageAnalysisResult, CustomerDetails, VideoTemplate } from '../types';
import { ImageCropper } from './ImageCropper';

interface Props {
    template?: VideoTemplate;
    uploadedImage: string | null;
    analysis: ImageAnalysisResult | null;
    details: CustomerDetails;
    selectedPricingTier: 'standard' | 'extended';
    generatedPreview: string | null;
    onPricingSelect: (tier: 'standard' | 'extended') => void;
    onImageUpload: (image: string, analysis: ImageAnalysisResult) => void;
    onPreviewGenerated: (preview: string) => void;
    onDetailsChange: (details: CustomerDetails) => void;
    onClear: () => void;
    onSubmit: (stylePrompt: string) => void;
}

const COUNTRY_CODES = [
    { code: '+1', country: 'US/CA' },
    { code: '+44', country: 'UK' },
    { code: '+91', country: 'IN' },
    { code: '+61', country: 'AU' },
    { code: '+49', country: 'DE' },
    { code: '+33', country: 'FR' },
    { code: '+81', country: 'JP' },
    { code: '+86', country: 'CN' },
];

const STYLES = [
    { id: '3D Pixar-style animated movie character', label: '3D Disney/Pixar', emoji: '🎬' },
    { id: 'Studio Ghibli anime style, vibrant colors', label: 'Anime', emoji: '🗾' },
    { id: 'Classic superhero comic book style, bold lines', label: 'Comic Book', emoji: '💥' },
    { id: 'Soft watercolor storybook illustration', label: 'Watercolor', emoji: '🎨' },
    { id: 'Cinematic realistic lighting, high detail', label: 'Realistic', emoji: '📸' },
    { id: 'Claymation cute stop-motion style', label: 'Claymation', emoji: '🧸' },
    { id: 'custom', label: 'Custom Style', emoji: '✨' },
];

export const PhotoUpload: React.FC<Props> = ({
    template,
    uploadedImage,
    analysis,
    details,
    selectedPricingTier,
    generatedPreview,
    onPricingSelect,
    onImageUpload,
    onPreviewGenerated,
    onDetailsChange,
    onClear,
    onSubmit
}) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof CustomerDetails, string>>>({});
    const [tempImage, setTempImage] = useState<string | null>(null); // For cropping state
    const [selectedStyle, setSelectedStyle] = useState<string>(STYLES[0].id); // Default to first style
    const [customStylePrompt, setCustomStylePrompt] = useState<string>("");

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setImageError('Please upload a valid image file (JPEG, PNG).');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setImageError('File size too large. Please upload an image smaller than 10MB.');
            return;
        }

        setImageError(null);

        // Read file for cropping
        const reader = new FileReader();
        reader.onloadend = () => {
            setTempImage(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Reset file input
        event.target.value = '';
    };

    const handleCropComplete = async (croppedBase64: string) => {
        setTempImage(null); // Hide cropper
        setIsAnalyzing(true);

        try {
            const result = await analyzeImage(croppedBase64);
            onImageUpload(croppedBase64, result);
        } catch (err) {
            setImageError('Failed to analyze image. Please check your internet connection and try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDetailChange = (field: keyof CustomerDetails, value: any) => {
        onDetailsChange({ ...details, [field]: value });
        if (formErrors[field]) {
            setFormErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof CustomerDetails, string>> = {};
        let isValid = true;

        if (!details.childName.trim()) {
            newErrors.childName = 'Child\'s name is required';
            isValid = false;
        }

        if (!details.email.trim()) {
            newErrors.email = 'Email address is required';
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(details.email)) {
            newErrors.email = 'Please enter a valid email';
            isValid = false;
        }

        if (!details.consent) {
            newErrors.consent = 'You must provide consent to proceed';
            isValid = false;
        }

        if (details.whatsappNumber && !/^\d+$/.test(details.whatsappNumber)) {
            newErrors.whatsappNumber = 'Phone number must contain only digits';
            isValid = false;
        }

        setFormErrors(newErrors);
        return isValid;
    };

    const getActiveStylePrompt = () => {
        if (selectedStyle === 'custom') {
            return customStylePrompt.trim() || template?.stylePrompt || "3D Pixar-style animated movie character";
        }
        return selectedStyle || template?.stylePrompt || "3D Pixar-style animated movie character";
    };

    const handleContinue = async () => {
        // Prevent multiple simultaneous requests
        if (isGeneratingPreview) {
            console.log('Already generating preview, ignoring duplicate request');
            return;
        }

        // 1. Check Image
        if (!uploadedImage || !analysis || !analysis.isValid) {
            setImageError("Please upload a valid photo before proceeding.");
            const uploadSection = document.getElementById('upload-section');
            uploadSection?.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        // 2. Check Form
        if (!validateForm()) {
            return;
        }

        // 3. Determine Style
        if (selectedStyle === 'custom' && !customStylePrompt.trim()) {
            setImageError("Please describe your custom style in the text box.");
            return;
        }

        const styleToUse = getActiveStylePrompt();

        // 4. Generate
        setIsGeneratingPreview(true);
        setImageError(null); // Clear previous errors

        try {
            const preview = await generateCharacterPreview(
                uploadedImage,
                details.age,
                details.gender,
                styleToUse
            );
            onPreviewGenerated(preview);
            setShowPreviewModal(true);
        } catch (error: any) {
            console.error('Preview generation error:', error);
            setImageError(error?.message || "Failed to generate preview. Please try again.");
        } finally {
            setIsGeneratingPreview(false);
        }
    };

    const handleFinalSubmit = () => {
        // Pass the active style prompt up to the app state
        onSubmit(getActiveStylePrompt());
    };

    const renderQualityBadge = (label: string, value: boolean | string) => {
        let color = 'bg-slate-100 text-slate-600';
        let icon = <div className="w-2 h-2 rounded-full bg-slate-400" />;

        if (value === true || value === 'GOOD' || value === 'EXCELLENT') {
            color = 'bg-green-100 text-green-700';
            icon = <CheckCircle className="w-3 h-3" />;
        } else if (value === false || value === 'POOR') {
            color = 'bg-red-100 text-red-700';
            icon = <AlertCircle className="w-3 h-3" />;
        }

        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
                {icon}
                {label}
            </span>
        );
    };

    return (
        <div className="max-w-3xl mx-auto relative">

            {/* Header */}
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-indigo-900 mb-3">Customize Your Adventure</h2>
                <p className="text-slate-600 max-w-xl mx-auto">
                    Select your video package and upload a photo to get started.
                </p>
            </div>

            {/* Pricing Module */}
            {template && (
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-indigo-100 mb-12">

                    <div className="mb-6">
                        <p className="text-lg text-slate-700 font-medium leading-relaxed">{template.description}</p>
                        <div className="flex flex-wrap gap-2 mt-4">
                            {template.tags?.map(tag => (
                                <span key={tag} className="px-3 py-1 bg-violet-50 text-violet-700 rounded-full text-sm font-semibold border border-violet-100">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            Video Package
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Standard Option */}
                            <div
                                onClick={() => onPricingSelect('standard')}
                                className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex flex-col justify-between h-full group
                        ${selectedPricingTier === 'standard'
                                        ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-1 ring-indigo-600'
                                        : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`font-bold tracking-wide ${selectedPricingTier === 'standard' ? 'text-indigo-900' : 'text-slate-700'}`}>STANDARD CLIP</span>
                                        <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Value</span>
                                    </div>
                                    <div className="flex items-baseline gap-1 mb-3">
                                        <span className="text-3xl font-extrabold text-slate-900">$12.99</span>
                                    </div>
                                    <ul className="space-y-2 mb-4">
                                        <li className="flex items-center text-sm text-slate-600">
                                            <Clock className="w-4 h-4 mr-2 text-indigo-500" />
                                            75 Seconds Duration
                                        </li>
                                        <li className="flex items-center text-sm text-slate-600">
                                            <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                                            HD Digital Download
                                        </li>
                                    </ul>
                                </div>
                                <div className={`w-full h-1.5 rounded-full ${selectedPricingTier === 'standard' ? 'bg-indigo-600' : 'bg-slate-200 group-hover:bg-indigo-200'}`}></div>
                            </div>

                            {/* Extended Option */}
                            <div
                                onClick={() => onPricingSelect('extended')}
                                className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex flex-col justify-between h-full group
                        ${selectedPricingTier === 'extended'
                                        ? 'border-purple-600 bg-purple-50/50 shadow-md ring-1 ring-purple-600'
                                        : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'}`}
                            >
                                {/* Recommended Badge */}
                                {selectedPricingTier === 'extended' && (
                                    <div className="absolute -top-3 right-4 bg-purple-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">
                                        MOST POPULAR
                                    </div>
                                )}

                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`font-bold tracking-wide ${selectedPricingTier === 'extended' ? 'text-purple-900' : 'text-slate-700'}`}>EXTENDED ADVENTURE</span>
                                        <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Premium</span>
                                    </div>
                                    <div className="flex items-baseline gap-1 mb-3">
                                        <span className="text-3xl font-extrabold text-slate-900">$14.99</span>
                                    </div>
                                    <ul className="space-y-2 mb-4">
                                        <li className="flex items-center text-sm text-slate-600">
                                            <Clock className="w-4 h-4 mr-2 text-purple-500" />
                                            120 Seconds Duration
                                        </li>
                                        <li className="flex items-center text-sm text-slate-600">
                                            <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
                                            Extra Story Scenes
                                        </li>
                                    </ul>
                                </div>
                                <div className={`w-full h-1.5 rounded-full ${selectedPricingTier === 'extended' ? 'bg-purple-600' : 'bg-slate-200 group-hover:bg-purple-200'}`}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Guidelines Section */}
            {!tempImage && (
                <>
                    <h3 className="text-xl font-bold text-slate-900 mb-4 px-2">Photo Guidelines</h3>
                    <div className="mb-8 rounded-3xl overflow-hidden shadow-sm border border-slate-200">
                        <img
                            src="https://www.talesberry.com/photo_guidelines.jpg"
                            alt="Photo Guidelines"
                            className="w-full h-auto block"
                        />
                    </div>
                </>
            )}

            {/* Upload & Crop Section */}
            <div id="upload-section">

                {tempImage ? (
                    <ImageCropper
                        imageSrc={tempImage}
                        onCrop={handleCropComplete}
                        onCancel={() => setTempImage(null)}
                    />
                ) : uploadedImage && analysis ? (
                    <div className="flex flex-col items-center w-full space-y-6 mb-10">
                        <div className="relative group w-full aspect-square md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-slate-100">
                            <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
                            <button
                                onClick={onClear}
                                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm p-3">
                                <div className="flex justify-between items-center text-white">
                                    <span className="text-sm font-medium">Quality Score</span>
                                    <span className={`text-lg font-bold ${analysis.score > 70 ? 'text-green-400' : 'text-yellow-400'}`}>
                                        {analysis.score}/100
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className={`w-full p-6 rounded-xl border ${analysis.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${analysis.isValid ? 'text-green-800' : 'text-red-800'}`}>
                                {analysis.isValid ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                {analysis.isValid ? 'Great Photo!' : 'Photo Needs Attention'}
                            </h3>
                            <p className="text-slate-700 mb-4">{analysis.feedback}</p>

                            <div className="flex flex-wrap gap-2">
                                {renderQualityBadge(analysis.isClear ? 'Sharp Focus' : 'Blurry', analysis.isClear)}
                                {renderQualityBadge(`Lighting: ${analysis.lighting}`, analysis.lighting)}
                                {renderQualityBadge(analysis.faceCount === 1 ? 'Single Face' : `${analysis.faceCount} Faces`, analysis.faceCount === 1)}
                            </div>

                            {!analysis.isValid && (
                                <button
                                    onClick={onClear}
                                    className="mt-4 w-full py-2 bg-white border border-red-300 text-red-700 font-semibold rounded-lg hover:bg-red-50 transition-colors"
                                >
                                    Try Another Photo
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div
                        onClick={() => !isAnalyzing && fileInputRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center transition-all cursor-pointer bg-white mb-10
            ${isAnalyzing ? 'border-indigo-200 bg-indigo-50 opacity-80 cursor-wait' : 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/50 shadow-sm hover:shadow-md'}
            `}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                            disabled={isAnalyzing}
                        />

                        {isAnalyzing ? (
                            <div className="flex flex-col items-center py-12">
                                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                                <h3 className="text-xl font-semibold text-indigo-900">Analyzing Photo...</h3>
                                <p className="text-slate-500 mt-2">Checking for face clarity and lighting</p>
                            </div>
                        ) : (
                            <div className="py-8">
                                <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Camera className="w-10 h-10" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Click to Upload</h3>
                                <p className="text-slate-500 mb-6 max-w-xs mx-auto">or drag and drop your image here. Supported formats: JPG, PNG.</p>
                                <button className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-full shadow-lg hover:bg-indigo-700 transition-transform active:scale-95">
                                    Select Photo
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {imageError && (
                    <div className="mb-10 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p>{imageError}</p>
                    </div>
                )}
            </div>

            {/* Details Form */}
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-indigo-100 space-y-6">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-4">
                    <h3 className="text-xl font-bold text-indigo-900">Details</h3>
                </div>

                <div className="space-y-4">
                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email ID <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="email"
                                value={details.email}
                                onChange={(e) => handleDetailChange('email', e.target.value)}
                                className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:outline-none transition-colors ${formErrors.email ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'}`}
                                placeholder="Email for receiving the video download link"
                            />
                        </div>
                        {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                    </div>

                    {/* WhatsApp */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp Number <span className="text-slate-400 font-normal">(Optional)</span></label>
                        <div className="flex gap-2">
                            <select
                                value={details.countryCode}
                                onChange={(e) => handleDetailChange('countryCode', e.target.value)}
                                className="w-24 px-2 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none text-sm bg-white"
                            >
                                {COUNTRY_CODES.map((c) => (
                                    <option key={c.code} value={c.code}>{c.code} {c.country}</option>
                                ))}
                            </select>
                            <div className="relative flex-1">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="tel"
                                    value={details.whatsappNumber}
                                    onChange={(e) => handleDetailChange('whatsappNumber', e.target.value)}
                                    className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:outline-none transition-colors ${formErrors.whatsappNumber ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'}`}
                                    placeholder="10 digit number"
                                />
                            </div>
                        </div>
                        {formErrors.whatsappNumber && <p className="text-red-500 text-xs mt-1">{formErrors.whatsappNumber}</p>}
                    </div>

                    {/* Child Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Child's first name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={details.childName}
                                onChange={(e) => handleDetailChange('childName', e.target.value)}
                                className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:outline-none transition-colors ${formErrors.childName ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'}`}
                                placeholder="Name to be featured in the video"
                            />
                        </div>
                        {formErrors.childName && <p className="text-red-500 text-xs mt-1">{formErrors.childName}</p>}
                    </div>

                    {/* Age and Gender */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Child's age</label>
                            <select
                                value={details.age}
                                onChange={(e) => handleDetailChange('age', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white"
                            >
                                <option value="" disabled>Select age</option>
                                {[...Array(13)].map((_, i) => (
                                    <option key={i} value={i + 3}>{i + 3} years</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Child's Gender</label>
                            <select
                                value={details.gender}
                                onChange={(e) => handleDetailChange('gender', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none bg-white"
                            >
                                <option value="Boy">Boy</option>
                                <option value="Girl">Girl</option>
                                <option value="Neutral">Neutral</option>
                            </select>
                        </div>
                    </div>

                    {/* Style Selector */}
                    <div className="pt-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                            <Palette className="w-4 h-4 text-indigo-600" />
                            Choose Art Style
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {STYLES.map((style) => (
                                <button
                                    key={style.id}
                                    onClick={() => setSelectedStyle(style.id)}
                                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-center transition-all
                            ${selectedStyle === style.id
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500'
                                            : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-600'}`}
                                >
                                    <span className="text-2xl">{style.emoji}</span>
                                    <span className="text-xs font-bold">{style.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Custom Style Input */}
                        {selectedStyle === 'custom' && (
                            <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs font-bold text-indigo-900 mb-1 ml-1">
                                    Describe your custom style
                                </label>
                                <textarea
                                    value={customStylePrompt}
                                    onChange={(e) => setCustomStylePrompt(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none text-sm min-h-[80px] bg-indigo-50/30 placeholder-slate-400 resize-none"
                                    placeholder="e.g. Vintage oil painting, Cyberpunk 2077 style neon lights, Lego style characters, Black and white sketch..."
                                />
                            </div>
                        )}
                    </div>

                    {/* Consent */}
                    <div>
                        <div className={`flex items-start gap-3 p-4 rounded-lg border ${formErrors.consent ? 'bg-red-50 border-red-200' : 'bg-indigo-50 border-indigo-100'}`}>
                            <div className="flex items-center h-5">
                                <input
                                    id="consent"
                                    type="checkbox"
                                    checked={details.consent}
                                    onChange={(e) => handleDetailChange('consent', e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="consent" className="font-medium text-slate-800">Parental Consent</label>
                                <p className="text-slate-600 mt-1 leading-tight">
                                    I confirm, I am the parent or legal guardian of this child (or I have the necessary permission from the parent of this child), I am over 18, and I consent to providing these details for creating a personalised video story in accordance with the Privacy Policy.
                                </p>
                            </div>
                        </div>
                        {formErrors.consent && <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.consent}</p>}
                    </div>

                </div>

                <div className="pt-4">
                    <button
                        onClick={handleContinue}
                        disabled={isGeneratingPreview}
                        className={`w-full md:w-auto px-10 py-4 text-lg font-bold rounded-full transition-all shadow-lg flex items-center justify-center gap-2 transform ${isGeneratingPreview
                                ? 'bg-indigo-400 text-white cursor-wait pointer-events-none'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-200 hover:-translate-y-0.5'
                            }`}
                    >
                        {isGeneratingPreview ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Generating Preview...
                            </>
                        ) : (
                            <>
                                Next
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </div>

            </div>

            {/* Character Preview Modal */}
            {showPreviewModal && generatedPreview && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-4xl animate-in zoom-in-95">
                        <div className="p-6 md:p-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-center">
                            <h3 className="text-3xl font-extrabold mb-2">Meet {details.childName}!</h3>
                            <p className="text-indigo-100">Here is a preview of how the character might look.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-slate-50">
                            {/* Original */}
                            <div className="space-y-3 text-center">
                                <h4 className="font-bold text-slate-600">Your Photo</h4>
                                <div className="rounded-2xl overflow-hidden shadow-md border-4 border-white aspect-square">
                                    <img src={uploadedImage || ''} alt="Original" className="w-full h-full object-cover" />
                                </div>
                            </div>

                            {/* Generated */}
                            <div className="space-y-3 text-center">
                                <h4 className="font-bold text-indigo-600 flex items-center justify-center gap-2">
                                    <Wand2 className="w-4 h-4" />
                                    {selectedStyle === 'custom' ? 'Custom Version' : 'Cartoon Version'}
                                </h4>
                                <div className="rounded-2xl overflow-hidden shadow-xl border-4 border-indigo-200 aspect-square relative group">
                                    <img src={generatedPreview} alt="Generated Character" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-white border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                            <p className="text-sm text-slate-500 italic text-center md:text-left">
                                * Note: This is an AI generated preview. The final video animation will be fully animated.
                            </p>
                            <div className="flex gap-4 w-full md:w-auto">
                                <button
                                    onClick={() => setShowPreviewModal(false)}
                                    className="flex-1 md:flex-none px-6 py-3 border border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    Try Again
                                </button>
                                <button
                                    onClick={handleFinalSubmit}
                                    className="flex-1 md:flex-none px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    Approved, Continue
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};