// src/components/PPTPreview.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react';

const PPTPreview = ({ pptJson }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  if (!pptJson || !pptJson.slides?.length) return <p className="text-center text-gray-600 dark:text-gray-400">No slides generated yet.</p>;
  const prevSlide = () => setCurrentSlide(prev => Math.max(0, prev - 1));
  const nextSlide = () => setCurrentSlide(prev => Math.min(pptJson.slides.length - 1, prev + 1));
  return (
    <motion.div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"><Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Slide Preview</h3>
      <div className="relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-blue-200/50 dark:border-gray-700/50 rounded-xl p-6 min-h-[300px] flex items-center justify-center shadow-sm">
        <motion.div key={currentSlide} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="w-full text-center space-y-4">
          <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{pptJson.slides[currentSlide].title}</h4>
          <p className="text-base text-gray-800 dark:text-gray-200 whitespace-pre-line">{pptJson.slides[currentSlide].content}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-4">Layout: {pptJson.slides[currentSlide].layout}</p>
        </motion.div>
        <button onClick={prevSlide} disabled={currentSlide === 0} className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 rounded-full hover:bg-blue-100/50 dark:hover:bg-blue-900/50 transition-all duration-200 disabled:opacity-50">
          <ChevronLeft className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </button>
        <button onClick={nextSlide} disabled={currentSlide === pptJson.slides.length - 1} className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 rounded-full hover:bg-blue-100/50 dark:hover:bg-blue-900/50 transition-all duration-200 disabled:opacity-50">
          <ChevronRight className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </button>
        <div className="absolute bottom-4 left-0 right-0 text-center text-sm text-gray-900 dark:text-gray-100">
          Slide {currentSlide + 1} of {pptJson.slides.length}
        </div>
      </div>
    </motion.div>
  );
};
export default PPTPreview;