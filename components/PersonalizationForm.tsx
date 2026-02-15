import React, { useState } from 'react';
import { CustomerDetails } from '../types';
import { User, Mail, Phone, Calendar, CheckSquare } from 'lucide-react';

interface Props {
  initialDetails: CustomerDetails;
  onSubmit: (details: CustomerDetails) => void;
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

export const PersonalizationForm: React.FC<Props> = ({ initialDetails, onSubmit }) => {
  const [formData, setFormData] = useState<CustomerDetails>(initialDetails);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerDetails, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CustomerDetails, string>> = {};
    let isValid = true;

    if (!formData.childName.trim()) {
      newErrors.childName = 'Child\'s name is required';
      isValid = false;
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
      isValid = false;
    }

    if (!formData.consent) {
      newErrors.consent = 'You must provide consent to proceed';
      isValid = false;
    }
    
    // Optional whatsapp validation if filled
    if (formData.whatsappNumber && !/^\d+$/.test(formData.whatsappNumber)) {
        newErrors.whatsappNumber = 'Phone number must contain only digits';
        isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const handleChange = (field: keyof CustomerDetails, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-indigo-900 mb-2">Personalize the Story</h2>
        <p className="text-slate-600">Tell us a bit about the star of the show!</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg border border-indigo-100 space-y-6">
        
        {/* Child Details Section */}
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-indigo-900 border-b border-indigo-100 pb-2">Child's Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={formData.childName}
                            onChange={(e) => handleChange('childName', e.target.value)}
                            className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:outline-none transition-colors ${errors.childName ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'}`}
                            placeholder="e.g. Roni"
                        />
                    </div>
                    {errors.childName && <p className="text-red-500 text-xs mt-1">{errors.childName}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                        <select
                            value={formData.age}
                            onChange={(e) => handleChange('age', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                        >
                            {[...Array(13)].map((_, i) => (
                                <option key={i} value={i + 3}>{i + 3} years</option>
                            ))}
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                        <select
                            value={formData.gender}
                            onChange={(e) => handleChange('gender', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                        >
                            <option value="Boy">Boy</option>
                            <option value="Girl">Girl</option>
                            <option value="Neutral">Neutral</option>
                        </select>
                     </div>
                </div>
            </div>
        </div>

        {/* Contact Details Section */}
        <div className="space-y-4 pt-4">
            <h3 className="text-lg font-semibold text-indigo-900 border-b border-indigo-100 pb-2">Parent's Contact</h3>
            
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:outline-none transition-colors ${errors.email ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'}`}
                        placeholder="parent@example.com"
                    />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp Number <span className="text-slate-400 font-normal">(Optional)</span></label>
                <div className="flex gap-2">
                    <select
                        value={formData.countryCode}
                        onChange={(e) => handleChange('countryCode', e.target.value)}
                        className="w-24 px-2 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none text-sm"
                    >
                        {COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.code}>{c.code} {c.country}</option>
                        ))}
                    </select>
                    <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="tel"
                            value={formData.whatsappNumber}
                            onChange={(e) => handleChange('whatsappNumber', e.target.value)}
                            className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:outline-none transition-colors ${errors.whatsappNumber ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'}`}
                            placeholder="1234567890"
                        />
                    </div>
                </div>
                {errors.whatsappNumber && <p className="text-red-500 text-xs mt-1">{errors.whatsappNumber}</p>}
            </div>
        </div>

        {/* Consent Section */}
        <div className="pt-4">
            <div className={`flex items-start gap-3 p-4 rounded-lg border ${errors.consent ? 'bg-red-50 border-red-200' : 'bg-indigo-50 border-indigo-100'}`}>
                <div className="flex items-center h-5">
                    <input
                        id="consent"
                        type="checkbox"
                        checked={formData.consent}
                        onChange={(e) => handleChange('consent', e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                </div>
                <div className="ml-3 text-sm">
                    <label htmlFor="consent" className="font-medium text-slate-800">Parental Consent</label>
                    <p className="text-slate-600 mt-1">
                        I confirm that I am the parent or legal guardian of the child pictured, I am over 18 years of age, and I consent to providing these details for the purpose of creating this personalized video.
                    </p>
                </div>
            </div>
             {errors.consent && <p className="text-red-500 text-xs mt-1 ml-1">{errors.consent}</p>}
        </div>

        {/* Action Buttons */}
        <div className="pt-6">
            <button
                type="submit"
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
                Continue to Payment
                <CheckSquare className="w-5 h-5" />
            </button>
        </div>

      </form>
    </div>
  );
};
