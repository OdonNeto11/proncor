// src/components/ui/FileUpload.tsx
import React from 'react';
import { Upload, Paperclip, Trash2 } from 'lucide-react';
import { themeClasses } from './Typography';

interface FileUploadProps {
  arquivos: File[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveArquivo: (index: number) => void;
  maxFiles?: number;
  label?: string;
}

export function FileUpload({ arquivos, onFileChange, onRemoveArquivo, maxFiles = 5, label = "Anexos" }: FileUploadProps) {
  return (
    <div className="w-full">
      <label className={`text-sm font-semibold mb-1.5 block ${themeClasses.text}`}>
        {label} (Máx: {maxFiles})
      </label>
      <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/50 p-6 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-400 transition-colors relative text-center">
          <input 
            type="file" 
            multiple 
            onChange={onFileChange} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            accept=".pdf,image/*" 
          />
          <div className="flex flex-col items-center justify-center gap-2">
             <Upload size={32} className="text-blue-400" />
             <p className={`text-sm font-medium ${themeClasses.text}`}>Clique ou arraste arquivos aqui</p>
             <p className="text-xs text-slate-400">PDF ou Imagens</p>
          </div>
      </div>
      {arquivos.length > 0 && (
          <div className="mt-3 space-y-2">
              {arquivos.map((arq, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2 overflow-hidden">
                  <Paperclip size={16} className="text-blue-600 flex-shrink-0" />
                  <span className={`text-sm truncate ${themeClasses.text}`}>{arq.name}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => onRemoveArquivo(index)} 
                    className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 rounded transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
              </div>
              ))}
          </div>
      )}
    </div>
  );
}