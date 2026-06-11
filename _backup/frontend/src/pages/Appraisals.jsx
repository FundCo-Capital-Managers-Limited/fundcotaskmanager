import React from 'react';
import { Award } from 'lucide-react';

const Appraisals = () => {
    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-md border border-teal-100/50">
                <div className="flex items-center gap-3 mb-6">
                    <Award className="w-8 h-8 text-teal-500" />
                    <h1 className="text-2xl font-semibold text-gray-800">Appraisals</h1>
                </div>
                <p className="text-gray-600">This is a placeholder for the Appraisals page. Add your appraisals management functionality here.</p>
            </div>
        </div>
    );
};

export default Appraisals;