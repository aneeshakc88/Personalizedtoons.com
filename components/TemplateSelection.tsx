import React, { useState } from 'react';
import { VideoTemplate } from '../types';
import { Play, CheckCircle, X, Maximize2 } from 'lucide-react';

interface Props {
  templates: VideoTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const TemplateSelection: React.FC<Props> = ({ templates, selectedId, onSelect }) => {
  const [previewTemplate, setPreviewTemplate] = useState<VideoTemplate | null>(null);

  const handlePreview = (e: React.MouseEvent, template: VideoTemplate) => {
    e.stopPropagation();
    setPreviewTemplate(template);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-indigo-900">Choose Your Adventure</h2>
        <p className="text-slate-600 max-w-2xl mx-auto">Select a magical story template to star your child in. Click the play button or title to preview the video.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => {
          const isSelected = selectedId === template.id;

          return (
            <div
              key={template.id}
              onClick={() => onSelect(template.id)}
              className={`relative group cursor-pointer rounded-2xl overflow-hidden border-4 transition-all duration-300 bg-white ${
                isSelected ? 'border-indigo-600 shadow-xl scale-[1.02]' : 'border-transparent hover:border-indigo-300 shadow-md hover:shadow-lg'
              }`}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video bg-slate-900 group-hover:opacity-90 transition-opacity">
                <img src={template.thumbnailUrl} alt={template.title} className="w-full h-full object-cover" />
                
                {/* Overlay Controls */}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    {isSelected && (
                        <div className="absolute top-3 right-3 bg-white text-indigo-600 rounded-full p-1 shadow-lg z-10 animate-in fade-in zoom-in">
                        <CheckCircle className="w-6 h-6" />
                        </div>
                    )}
                    
                    <button 
                        onClick={(e) => handlePreview(e, template)}
                        className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-110 hover:bg-white text-indigo-600"
                        title="Preview Video"
                    >
                        <Play className="w-8 h-8 ml-1" />
                    </button>
                    
                    <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1">
                      {template.duration}
                    </div>
                </div>
              </div>

              <div className="p-5">
                <div className="flex flex-wrap gap-2 mb-3">
                    {template.tags?.slice(0,2).map(tag => (
                        <span key={tag} className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md">
                            {tag}
                        </span>
                    ))}
                </div>
                
                <h3 
                    onClick={(e) => handlePreview(e, template)}
                    className="text-xl font-bold text-slate-900 mb-2 hover:text-indigo-600 transition-colors w-fit flex items-center gap-2 group-hover:text-indigo-700"
                    title="Click to preview"
                >
                    {template.title}
                    <Maximize2 className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                </h3>
                
                <p className="text-slate-600 text-sm leading-relaxed">{template.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Video Modal */}
      {previewTemplate && (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => setPreviewTemplate(null)}
        >
            <div 
                className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/10"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header/Controls */}
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10 flex justify-end">
                    <button 
                        onClick={() => setPreviewTemplate(null)}
                        className="p-2 bg-black/40 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                {/* Video Player */}
                <div className="aspect-video w-full bg-black flex items-center justify-center">
                     <video 
                        src={previewTemplate.previewVideoUrl} 
                        controls 
                        autoPlay 
                        className="w-full h-full max-h-[70vh]"
                     />
                </div>
                
                {/* Modal Footer */}
                <div className="p-6 bg-white flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-1">{previewTemplate.title}</h3>
                        <p className="text-slate-600 text-sm">{previewTemplate.description}</p>
                    </div>
                    <button 
                    onClick={() => {
                        onSelect(previewTemplate.id);
                        setPreviewTemplate(null);
                    }}
                    className="flex-shrink-0 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-indigo-500/30 whitespace-nowrap"
                    >
                    Select This Story
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};