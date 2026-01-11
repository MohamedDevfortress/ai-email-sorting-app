import { useState } from 'react';
import Image from 'next/image';

interface ScreenshotModalProps {
  screenshot: string | null; // base64 string
  onClose: () => void;
}

export default function ScreenshotModal({ screenshot, onClose }: ScreenshotModalProps) {
  if (!screenshot) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative max-w-6xl max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Unsubscribe Screenshot</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Screenshot */}
        <div className="p-6 overflow-auto max-h-[calc(90vh-80px)]">
          <img 
            src={`data:image/png;base64,${screenshot}`} 
            alt="Unsubscribe process screenshot"
            className="max-w-full h-auto rounded border shadow-md"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
          <a
            href={`data:image/png;base64,${screenshot}`}
            download="unsubscribe-screenshot.png"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Download
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
