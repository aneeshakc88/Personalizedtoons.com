import React from 'react';
import { AppStep } from '../types';
import { BookOpen, Camera, ShoppingBag } from 'lucide-react';

interface Props {
  currentStep: AppStep;
}

const steps = [
  { id: AppStep.TEMPLATE_SELECTION, icon: BookOpen, label: 'Story' },
  { id: AppStep.PHOTO_UPLOAD, icon: Camera, label: 'Personalize' },
  { id: AppStep.ORDER_SUMMARY, icon: ShoppingBag, label: 'Review' },
];

export const StepIndicator: React.FC<Props> = ({ currentStep }) => {
  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="max-w-3xl mx-auto mb-10">
      <div className="relative flex justify-between items-center">
        {/* Progress Line */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -z-10 rounded-full"></div>
        <div 
            className="absolute top-1/2 left-0 h-1 bg-indigo-600 -z-10 rounded-full transition-all duration-500 ease-in-out"
            style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((step, index) => {
          const isActive = index <= currentStepIndex;
          const isCurrent = step.id === currentStep;
          
          return (
            <div key={step.id} className="flex flex-col items-center gap-2 bg-slate-50 px-2">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                    ${isActive ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-slate-400'}
                    ${isCurrent ? 'ring-4 ring-indigo-100 scale-110' : ''}
                `}
              >
                <step.icon className="w-5 h-5" />
              </div>
              <span className={`text-xs font-semibold uppercase tracking-wider ${isActive ? 'text-indigo-900' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};