import React from 'react';
import { Camera, X, Upload } from 'lucide-react';

interface PhotoUploadProps {
  label: string;
  photos: string[];
  onUpload: (photos: string[]) => void;
  onRemove: (index: number) => void;
  maxPhotos?: number;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ label, photos, onUpload, onRemove, maxPhotos = 10 }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            
            if (photos.length + filesArray.length > maxPhotos) {
                alert(`Maksimal ${maxPhotos} foto diizinkan.`);
                return;
            }

            const newPhotos: string[] = [];
            let processedCount = 0;

            filesArray.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                        newPhotos.push(reader.result);
                    }
                    processedCount++;
                    if (processedCount === filesArray.length) {
                        onUpload([...photos, ...newPhotos]);
                    }
                };
                reader.readAsDataURL(file as Blob);
            });
        }
    };

    return (
        <div className="mb-4">
            <label className="text-sm font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2 mb-2">
                <Camera className="w-4 h-4" /> {label} <span className="text-xs font-normal normal-case text-gray-400">({photos.length}/{maxPhotos})</span>
            </label>
            
            <div className="grid grid-cols-3 gap-2 mb-2">
                {photos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group">
                        <img src={photo} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
                        <button 
                            onClick={() => onRemove(idx)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-70 hover:opacity-100 transition-opacity"
                            data-html2canvas-ignore="true"
                            type="button" 
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
                
                {photos.length < maxPhotos && (
                    <label className="aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors" data-html2canvas-ignore="true">
                        <Upload className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-500">Upload</span>
                        <input 
                            type="file" 
                            accept="image/*" 
                            multiple 
                            className="hidden" 
                            onChange={handleFileChange}
                        />
                    </label>
                )}
            </div>
        </div>
    );
};

export default PhotoUpload;