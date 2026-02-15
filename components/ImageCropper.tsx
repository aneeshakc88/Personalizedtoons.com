import React, { useState, useRef, useEffect } from 'react';
import { Minus, Plus, Crop } from 'lucide-react';

interface Props {
  imageSrc: string;
  onCrop: (croppedImage: string) => void;
  onCancel: () => void;
}

export const ImageCropper: React.FC<Props> = ({ imageSrc, onCrop, onCancel }) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Constants
  const CROP_SIZE = 280; // Size of the square crop box

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setDragStart({ x: clientX - pan.x, y: clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault(); // Prevent scrolling on touch
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setPan({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCrop = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;
    
    if (!ctx || !img) return;

    // Output high resolution
    const scaleFactor = 2; 
    canvas.width = CROP_SIZE * scaleFactor;
    canvas.height = CROP_SIZE * scaleFactor;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    // Center logic
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.translate(pan.x * scaleFactor, pan.y * scaleFactor);
    ctx.scale(zoom, zoom);
    
    // We assume the image is rendered with a height of roughly 300px in CSS
    // We need to match that relative scaling.
    // The CSS height is fixed at 300px.
    // The scale ratio between natural height and 300px:
    const displayHeight = 300;
    const ratio = img.naturalHeight / displayHeight;
    const displayWidth = img.naturalWidth / ratio;
    
    // Draw using display dimensions scaled by our canvas scaleFactor
    const drawWidth = displayWidth * scaleFactor;
    const drawHeight = displayHeight * scaleFactor;
    
    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    
    ctx.restore();
    
    const base64 = canvas.toDataURL('image/jpeg', 0.95);
    onCrop(base64);
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-indigo-100 overflow-hidden max-w-lg mx-auto">
        {/* Header */}
        <div className="bg-indigo-50/50 p-4 border-b border-indigo-100 flex justify-between items-center">
            <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                <Crop className="w-5 h-5" />
                Adjust Photo
            </h3>
        </div>

        {/* Crop Area */}
        <div 
            className="relative w-full h-[400px] bg-slate-800 overflow-hidden cursor-move touch-none flex items-center justify-center select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
        >
            {/* The Image */}
            <img 
                ref={imgRef}
                src={imageSrc} 
                alt="Crop Target"
                draggable={false}
                className="max-w-none origin-center transition-transform duration-75 ease-linear will-change-transform"
                style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    height: '300px', 
                    width: 'auto',
                }}
            />

            {/* Overlay - Darken Outside */}
            <div className="absolute inset-0 pointer-events-none bg-black/50">
                 {/* This creates the cutout effect using mask or simple layering */}
            </div>

            {/* The Clear Crop Box */}
            <div 
                className="absolute pointer-events-none border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                style={{ width: CROP_SIZE, height: CROP_SIZE }}
            >
                {/* Grid Lines */}
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/40 shadow-sm"></div>
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/40 shadow-sm"></div>
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/40 shadow-sm"></div>
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/40 shadow-sm"></div>
            </div>
            
            <div className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-xs font-medium pointer-events-none">
                Drag to Reposition
            </div>
        </div>

        {/* Controls */}
        <div className="p-6 space-y-6 bg-white">
            <div className="space-y-3">
                <div className="flex justify-between text-sm font-medium text-slate-600">
                    <span>Zoom</span>
                    <span>{Math.round(zoom * 100)}%</span>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setZoom(Math.max(1, zoom - 0.1))} className="p-1 hover:bg-slate-100 rounded-full text-indigo-600 transition-colors">
                        <Minus className="w-5 h-5" />
                    </button>
                    <input 
                        type="range" 
                        min="1" 
                        max="3" 
                        step="0.05"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <button onClick={() => setZoom(Math.min(3, zoom + 0.1))} className="p-1 hover:bg-slate-100 rounded-full text-indigo-600 transition-colors">
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex gap-4 pt-2">
                <button 
                    onClick={onCancel}
                    className="flex-1 px-4 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                >
                    Change Image
                </button>
                <button 
                    onClick={handleCrop}
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/30 transition-colors"
                >
                    Crop & Continue
                </button>
            </div>
        </div>
    </div>
  );
};