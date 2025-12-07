import React, { useState, useEffect, useRef } from 'react';
import { PenTool, Eraser, CheckCircle } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  savedImage: string | null;
  onSave: (image: string) => void;
  onClear: () => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ label, onSave, savedImage, onClear }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && !savedImage) {
      // Resize canvas to parent width
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
      }
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';
      }
    }
  }, [savedImage]);

  const getCoordinates = (event: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in event && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if ('clientX' in event) {
      clientX = (event as React.MouseEvent).clientX;
      clientY = (event as React.MouseEvent).clientY;
    } else {
      return { x: 0, y: 0 };
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent scrolling on touch devices when drawing
    if (e.type === 'touchstart') {
       // e.preventDefault(); // Note: might need passive: false listener if strictly preventing default
    }
    
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    // e.preventDefault(); 
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        onSave(canvas.toDataURL());
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    onClear();
  };

  return (
    <div className="mb-4" data-html2canvas-ignore="true">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
          <PenTool className="w-4 h-4" /> {label}
        </label>
        {savedImage && (
          <button 
            type="button"
            onClick={clearCanvas} 
            className="text-xs text-red-500 flex items-center gap-1 hover:underline"
          >
            <Eraser className="w-3 h-3" /> Hapus
          </button>
        )}
      </div>
      
      {savedImage ? (
         <div className="border-2 border-green-500 bg-white rounded-lg p-2 relative h-32 flex items-center justify-center">
            <img src={savedImage} alt="Signature" className="max-h-full object-contain" />
            <div className="absolute top-1 right-1">
                <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
         </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 touch-none relative h-32">
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair block"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-center pb-2 text-xs text-gray-400">
              <span className="mt-auto mb-2">Coret tanda tangan di sini</span>
            </div>
        </div>
      )}
    </div>
  );
};

export default SignaturePad;
