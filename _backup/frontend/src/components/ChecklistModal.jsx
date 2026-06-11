// ChecklistModal.jsx
import React, { useState, useEffect } from 'react';
import { CheckSquare, X } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:4000/api/tasks';

const ChecklistModal = ({ isOpen, onClose, task }) => {
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && task) {
      setChecklist(task.checklist?.map(item => ({ ...item })) || []);
    }
  }, [isOpen, task]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No auth token found');
    return { Authorization: `Bearer ${token}` };
  };

  const handleToggle = async (idx) => {
    setLoading(true);
    setError(null);
    const newList = [...checklist];
    newList[idx].completed = !newList[idx].completed;
    setChecklist(newList);

    try {
      await axios.put(`${API_BASE}/${task._id}/gp`, { checklist: newList }, { headers: getAuthHeaders() });
    } catch (err) {
      console.error('Error updating checklist:', err);
      setError('Failed to update checklist');
      // Revert on error
      newList[idx].completed = !newList[idx].completed;
      setChecklist(newList);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/30 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl relative p-6 sm:p-8 border border-blue-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <CheckSquare className="w-6 h-6 text-blue-700" />
            Checklist for {task.title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-50 rounded-full transition-colors duration-300 text-gray-600 hover:text-blue-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-200 flex items-center gap-2 mb-4">
            {error}
          </div>
        )}

        {/* Checklist Items */}
        {checklist.length === 0 ? (
          <p className="text-center text-gray-600">No checklist items added.</p>
        ) : (
          <ul className="space-y-4">
            {checklist.map((item, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => handleToggle(idx)}
                  disabled={loading}
                  className="h-5 w-5 text-blue-700 focus:ring-blue-500 border-blue-300 rounded transition-all duration-200"
                />
                <span className={`text-sm text-gray-800 font-medium flex-1 ${item.completed ? 'line-through text-gray-500' : ''}`}>{item.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ChecklistModal;