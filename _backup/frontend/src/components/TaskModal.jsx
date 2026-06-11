// components/TaskModal.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { Edit, Calendar, Flag, Save, X, PlusCircle, ListChecks, Trash2 } from 'lucide-react';

const TaskModal = ({ isOpen, onClose, taskToEdit, onSave, onLogout, isReadOnly = false }) => {
  const [taskData, setTaskData] = useState({ title: '', description: '', priority: 'Low', dueDate: '', id: null });
  const [checklist, setChecklist] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const today = new Date().toISOString().split('T')[0];
  const isApproved = taskToEdit?.submissionStatus === 'approved';
  const locked = isApproved || isReadOnly;

  useEffect(() => {
    if (!isOpen) return;
    if (taskToEdit) {
      setTaskData({
        title: taskToEdit.title || '',
        description: taskToEdit.description || '',
        priority: taskToEdit.priority || 'Low',
        dueDate: taskToEdit.dueDate?.split('T')[0] || '',
        id: taskToEdit._id,
      });
      setChecklist(taskToEdit.checklist?.map((i) => ({ ...i })) || []);
    } else {
      setTaskData({ title: '', description: '', priority: 'Low', dueDate: '', id: null });
      setChecklist([]);
    }
    setError(null);
  }, [isOpen, taskToEdit]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setTaskData((p) => ({ ...p, [name]: value }));
  }, []);

  const handleAddItem = () => {
    if (newItem.trim()) {
      setChecklist((p) => [...p, { text: newItem.trim(), completed: false }]);
      setNewItem('');
    }
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (locked) return;
    if (!taskData.title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (checklist.length === 0) {
      setError('Please add at least one checklist item. A process breakdown is required before the task can be created.');
      return;
    }
    if (taskData.dueDate && taskData.dueDate < today && !taskData.id) {
      setError('Due date cannot be in the past for new tasks.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      onSave?.({ _id: taskData.id, ...taskData, checklist: checklist.filter((i) => i.text.trim()) });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Unexpected error occurred');
      if (err.response?.status === 401) onLogout?.();
    } finally {
      setLoading(false);
    }
  }, [taskData, checklist, onSave, onClose, onLogout, today, locked]);

  if (!isOpen) return null;

  const PRIORITY_OPTIONS = [
    { value: 'Low', color: '#0369a1' },
    { value: 'Medium', color: '#ca8a04' },
    { value: 'High', color: '#dc2626' },
  ];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[1100] p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
    >
      <div
        className="rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--brand-light)' }}
            >
              {taskData.id ? (
                <Edit className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
              ) : (
                <PlusCircle className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
              )}
            </div>
            <h2 className="font-black text-base" style={{ color: 'var(--text-primary)' }}>
              {isReadOnly ? 'Task Details' : taskData.id ? 'Edit Task' : 'New Task'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">
            {error && (
              <div
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
                style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
              >
                <span className="w-4 h-4 rounded-full bg-red-200 flex items-center justify-center text-xs font-bold flex-shrink-0">!</span>
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Task Name *
              </label>
              <input
                type="text"
                name="title"
                value={taskData.title}
                onChange={handleChange}
                placeholder="What needs to be done?"
                className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
                disabled={locked}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Description
              </label>
              <textarea
                name="description"
                value={taskData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Add more detail…"
                className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none transition-colors resize-none"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
                disabled={locked}
              />
            </div>

            {/* Priority + Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Priority
                </label>
                <div className="flex gap-2">
                  {PRIORITY_OPTIONS.map(({ value, color }) => (
                    <button
                      key={value}
                      type="button"
                      disabled={locked}
                      onClick={() => setTaskData((p) => ({ ...p, priority: value }))}
                      className="flex-1 py-2.5 rounded-lg text-xs font-bold border-2 transition-all"
                      style={
                        taskData.priority === value
                          ? { borderColor: color, backgroundColor: color, color: '#fff' }
                          : { borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'transparent' }
                      }
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Due Date
                </label>
                <input
                  type="date"
                  name="dueDate"
                  value={taskData.dueDate}
                  onChange={handleChange}
                  min={taskData.id || locked ? undefined : today}
                  className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--input-border)',
                    color: 'var(--text-primary)',
                  }}
                  disabled={locked}
                />
              </div>
            </div>

            {/* Checklist */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Checklist {checklist.length > 0 && `(${checklist.filter((i) => i.completed).length}/${checklist.length})`}
              </label>

              {checklist.length > 0 && (
                <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                  {checklist.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                      style={{ backgroundColor: 'var(--bg-subtle)' }}
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => {
                          const n = [...checklist];
                          n[idx].completed = !n[idx].completed;
                          setChecklist(n);
                        }}
                        disabled={locked}
                        className="w-4 h-4 rounded flex-shrink-0 cursor-pointer"
                        style={{ accentColor: 'var(--brand-primary)' }}
                      />
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => {
                          const n = [...checklist];
                          n[idx].text = e.target.value;
                          setChecklist(n);
                        }}
                        disabled={locked}
                        className={`flex-1 text-sm bg-transparent focus:outline-none ${item.completed ? 'line-through' : ''
                          }`}
                        style={{ color: item.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}
                      />
                      {!locked && (
                        <button
                          type="button"
                          onClick={() => setChecklist(checklist.filter((_, i) => i !== idx))}
                          className="text-[var(--text-muted)] hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!locked && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddItem();
                      }
                    }}
                    placeholder="Add checklist item…"
                    className="flex-1 px-4 py-3 rounded-xl border text-sm focus:outline-none transition-colors"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--input-border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 flex-shrink-0"
                    style={{ backgroundColor: 'var(--brand-accent)' }}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          {!locked && (
            <div className="px-6 pb-6 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  <>
                    {taskData.id ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                    {taskData.id ? 'Update Task' : 'Create Task'}
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default TaskModal;