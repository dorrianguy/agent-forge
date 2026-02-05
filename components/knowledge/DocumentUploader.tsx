'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  File,
  FileSpreadsheet,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import type { Document, DocumentType, UploadProgress } from '@/lib/knowledge-types';

interface FileWithPreview {
  file: File;
  id: string;
  preview?: string;
  status: 'pending' | 'uploading' | 'processing' | 'done' | 'error';
  error?: string;
}

const ACCEPTED_TYPES: Record<string, DocumentType> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/csv': 'csv',
  '.md': 'md',
};

const FILE_ICONS: Record<string, React.ElementType> = {
  pdf: FileText,
  docx: FileText,
  txt: File,
  md: File,
  csv: FileSpreadsheet,
};

interface DocumentUploaderProps {
  knowledgeBaseId: string;
  onUploadComplete?: (documents: Document[]) => void;
}

export default function DocumentUploader({ knowledgeBaseId, onUploadComplete }: DocumentUploaderProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { addDocument, setUploadProgress } = useKnowledgeStore();

  const getFileType = (file: File): DocumentType | null => {
    const mimeType = ACCEPTED_TYPES[file.type];
    if (mimeType) return mimeType;
    
    // Check extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    return ACCEPTED_TYPES[ext] || null;
  };

  const handleFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: FileWithPreview[] = [];
    
    Array.from(fileList).forEach((file) => {
      const fileType = getFileType(file);
      if (fileType) {
        newFiles.push({
          file,
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          status: 'pending',
        });
      }
    });
    
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadFiles = async () => {
    if (files.length === 0 || isUploading) return;
    
    setIsUploading(true);
    const uploadedDocuments: Document[] = [];
    
    for (const fileItem of files) {
      if (fileItem.status !== 'pending') continue;
      
      // Update status to uploading
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileItem.id ? { ...f, status: 'uploading' } : f
        )
      );
      
      try {
        // Create form data
        const formData = new FormData();
        formData.append('file', fileItem.file);
        formData.append('knowledgeBaseId', knowledgeBaseId);
        
        // Set progress
        setUploadProgress(fileItem.id, {
          documentId: fileItem.id,
          stage: 'uploading',
          progress: 0,
          message: 'Uploading file...',
        });
        
        // Upload file
        const response = await fetch('/api/knowledge/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        
        const result = await response.json();
        
        // Update progress
        setUploadProgress(fileItem.id, {
          documentId: fileItem.id,
          stage: 'processing',
          progress: 50,
          message: 'Processing document...',
        });
        
        // Add to store
        addDocument(result.document);
        uploadedDocuments.push(result.document);
        
        // Update file status
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id ? { ...f, status: 'done' } : f
          )
        );
        
        // Clear progress
        setUploadProgress(fileItem.id, null);
        
      } catch (error) {
        console.error('Upload error:', error);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? { ...f, status: 'error', error: 'Upload failed' }
              : f
          )
        );
        setUploadProgress(fileItem.id, null);
      }
    }
    
    setIsUploading(false);
    
    // Clear successful uploads after a delay
    setTimeout(() => {
      setFiles((prev) => prev.filter((f) => f.status !== 'done'));
    }, 2000);
    
    onUploadComplete?.(uploadedDocuments);
  };

  const FileIcon = ({ type }: { type: string }) => {
    const Icon = FILE_ICONS[type] || File;
    return <Icon className="w-5 h-5" />;
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <motion.div
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
          isDragOver
            ? 'border-orange-500 bg-orange-500/10'
            : 'border-white/10 hover:border-white/20 hover:bg-white/5'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md,.csv"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
        
        <motion.div
          className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
            isDragOver
              ? 'bg-orange-500/20'
              : 'bg-white/5'
          }`}
          animate={isDragOver ? { scale: 1.1 } : { scale: 1 }}
        >
          <Upload className={`w-8 h-8 ${isDragOver ? 'text-orange-400' : 'text-white/50'}`} />
        </motion.div>
        
        <h3 className="text-lg font-semibold text-white mb-2">
          {isDragOver ? 'Drop files here' : 'Drag & drop files'}
        </h3>
        <p className="text-white/50 text-sm mb-4">
          or click to browse
        </p>
        
        <div className="flex flex-wrap justify-center gap-2">
          {['PDF', 'DOCX', 'TXT', 'MD', 'CSV'].map((type) => (
            <span
              key={type}
              className="px-2 py-1 text-xs rounded-md bg-white/5 text-white/60"
            >
              {type}
            </span>
          ))}
        </div>
      </motion.div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {files.map((fileItem) => {
              const fileType = getFileType(fileItem.file);
              return (
                <motion.div
                  key={fileItem.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    fileItem.status === 'error'
                      ? 'bg-red-500/20 text-red-400'
                      : fileItem.status === 'done'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-white/10 text-white/60'
                  }`}>
                    {fileItem.status === 'uploading' || fileItem.status === 'processing' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : fileItem.status === 'done' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : fileItem.status === 'error' ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <FileIcon type={fileType || 'txt'} />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {fileItem.file.name}
                    </p>
                    <p className="text-xs text-white/50">
                      {fileItem.error || (
                        fileItem.status === 'uploading' ? 'Uploading...' :
                        fileItem.status === 'processing' ? 'Processing...' :
                        fileItem.status === 'done' ? 'Uploaded' :
                        `${(fileItem.file.size / 1024).toFixed(1)} KB`
                      )}
                    </p>
                  </div>
                  
                  {fileItem.status === 'pending' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(fileItem.id);
                      }}
                      className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              );
            })}
            
            {/* Upload Button */}
            {files.some((f) => f.status === 'pending') && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={uploadFiles}
                disabled={isUploading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Upload {files.filter((f) => f.status === 'pending').length} file(s)
                  </>
                )}
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
