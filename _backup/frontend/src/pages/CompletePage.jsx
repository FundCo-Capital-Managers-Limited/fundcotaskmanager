// CompletePage.jsx
import React, { useMemo, useState } from 'react';
import { CheckCircle2, Filter, Search } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import TaskItem from '../components/TaskItem';
import TaskModal from '../components/TaskModal';

const SkeletonCard = () => (
  <div
    className="rounded-xl border p-4 animate-pulse"
    style={{
      backgroundColor: 'var(--bg-surface)',
      borderColor: 'var(--border-color)',
    }}
  >
    <div className="flex items-start gap-3">
      <div className="flex-1 space-y-2.5">
        <div className="h-3.5 rounded w-3/4" style={{ backgroundColor: 'var(--bg-hover)' }} />
        <div className="h-2.5 rounded w-1/3" style={{ backgroundColor: 'var(--bg-subtle)' }} />
        <div className="h-2 rounded w-full" style={{ backgroundColor: 'var(--bg-subtle)' }} />
      </div>
    </div>
  </div>
);

const CompletePage = () => {
  const { tasks = [], tasksLoading, fetchTasks: refreshTasks } = useOutletContext();
  const [sortBy, setSortBy] = useState('newest');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const sortedCompletedTasks = useMemo(() => {
    return tasks
      .filter(
        (t) =>
          t.completed === true ||
          t.completed === 1 ||
          (typeof t.completed === 'string' && t.completed.toLowerCase() === 'yes')
      )
      .filter((t) =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        const order = { high: 3, medium: 2, low: 1 };
        return (order[b.priority?.toLowerCase()] || 0) - (order[a.priority?.toLowerCase()] || 0);
      });
  }, [tasks, sortBy, search]);

  return (
    <div className="space-y-5 py-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#f0fdf4' }}
          >
            <CheckCircle2 className="w-5 h-5" style={{ color: '#16a34a' }} />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Completed Tasks</h1>
            <p className="text-sm font-medium" style={{ color: '#16a34a' }}>
              {sortedCompletedTasks.length} task{sortedCompletedTasks.length !== 1 ? 's' : ''} done
            </p>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div
        className="rounded-xl border p-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search completed tasks…"
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none transition-colors"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--input-border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Sort */}
          <div className="relative">
            <Filter
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'var(--text-muted)' }}
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="pl-9 pr-8 py-2.5 rounded-lg border text-sm focus:outline-none appearance-none cursor-pointer transition-colors"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--input-border)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="priority">By Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task list */}
      {tasksLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : sortedCompletedTasks.length === 0 ? (
        <div
          className="rounded-xl border py-16 text-center"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: '#f0fdf4' }}
          >
            <CheckCircle2 className="w-7 h-7" style={{ color: '#16a34a' }} />
          </div>
          <h3 className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>No completed tasks yet</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Finish some tasks and they’ll appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {sortedCompletedTasks.map((task) => (
            <div key={task._id || task.id}>
              <TaskItem
                task={task}
                showCompleteCheckbox={false}
                onRefresh={refreshTasks}
              />
            </div>
          ))}
        </div>
      )}

      <TaskModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setSelectedTask(null); refreshTasks?.(); }}
        taskToEdit={selectedTask}
      />
    </div>
  );
};

export default CompletePage;