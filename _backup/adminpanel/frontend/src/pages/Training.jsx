import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Award, BookOpen, CheckCircle2, Plus, Search, TrendingUp, Users, X } from 'lucide-react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState, LoadingScreen, Modal, PageHeader, Panel, SearchInput, StatCard } from '../components/ui.jsx';

const levelColors = { beginner: { c: '#059669', bg: '#ecfdf5' }, intermediate: { c: '#d97706', bg: '#fffbeb' }, expert: { c: '#7c3aed', bg: '#f5f3ff' } };

const Training = () => {
  const { hasRole } = useAuth();
  const [courses, setCourses] = useState([]);
  const [progress, setProgress] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/learning/courses'), api.get('/learning/progress'), api.get('/learning/stats')])
      .then(([c, p, s]) => {
        setCourses(c.data.courses || []);
        setProgress(p.data.progress || []);
        setStats(s.data.stats || {});
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (form) => {
    try {
      await api.post('/learning/courses', form);
      toast.success('Course created!');
      setShowCreate(false);
      const { data } = await api.get('/learning/courses');
      setCourses(data.courses || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const filtered = courses.filter((course) => !search || course.title.toLowerCase().includes(search.toLowerCase()) || course.description?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <LoadingScreen />;

  return (
    <div className="page-shell">
      <PageHeader title="Training" actions={hasRole('admin') ? <button className="btn-primary rounded-full" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Create Course</button> : null} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Courses', value: stats.totalCourses || 0, icon: BookOpen, tone: 'var(--c-accent)' },
          { label: 'Enrollments', value: stats.enrolled || 0, icon: Users, tone: '#3B82F6' },
          { label: 'Completed', value: stats.completed || 0, icon: CheckCircle2, tone: '#059669' },
          { label: 'Certified', value: stats.certified || 0, icon: Award, tone: '#7c3aed' },
          { label: 'Avg progress', value: `${stats.avgProgress || 0}%`, icon: TrendingUp, tone: '#d97706' },
        ].map((item) => <StatCard key={item.label} label={item.label} value={item.value} icon={item.icon} tone={item.tone} />)}
      </div>
      <Panel><SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses..." icon={Search} /></Panel>
      {filtered.length === 0 ? <EmptyState icon={BookOpen} title="No courses found" description="Create the first course or change your search query." /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((course) => {
            const level = levelColors[course.level] || levelColors.beginner;
            const enrolled = progress.filter((item) => String(item.courseId?._id || item.courseId) === String(course._id)).length;
            const completed = progress.filter((item) => String(item.courseId?._id || item.courseId) === String(course._id) && item.progress === 100).length;
            return (
              <div key={course._id} className="card p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="badge capitalize" style={{ background: level.bg, color: level.c }}>{course.level}</span>
                  <span className="badge" style={{ background: 'var(--c-surface-raised)', color: 'var(--c-text-2)' }}>{course.assetco}</span>
                  {course.required ? <span className="badge" style={{ background: '#fef2f2', color: '#dc2626' }}>Required</span> : null}
                </div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--c-text-0)' }}>{course.title}</h3>
                <p className="mt-2 text-sm" style={{ color: 'var(--c-text-3)' }}>{course.description || 'No description yet.'}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm" style={{ color: 'var(--c-text-3)' }}>
                  <span>{course.modules?.length || 0} modules</span>
                  <span>{enrolled} enrolled</span>
                  <span style={{ color: '#059669' }}>{completed} completed</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {progress.length ? (
        <Panel title="Learner progress" subtitle={`${progress.length} learners tracked`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="table-header">User</th><th className="table-header">Course</th><th className="table-header text-right">Progress</th><th className="table-header text-right">Best Exam</th><th className="table-header text-center">Certified</th></tr></thead>
              <tbody>{progress.slice(0, 50).map((item) => <tr key={item._id} className="table-row"><td className="table-cell font-semibold" style={{ color: 'var(--c-text-0)' }}>{item.userId?.firstName} {item.userId?.lastName}</td><td className="table-cell">{item.courseId?.title || '-'}</td><td className="table-cell text-right font-bold" style={{ color: item.progress === 100 ? '#059669' : 'var(--c-accent)' }}>{item.progress}%</td><td className="table-cell text-right">{item.bestExamScore || '-'}%</td><td className="table-cell text-center">{item.certificationEarned ? 'Yes' : '-'}</td></tr>)}</tbody>
            </table>
          </div>
        </Panel>
      ) : null}
      <CourseModal open={showCreate} onClose={() => setShowCreate(false)} onSubmit={handleCreate} />
    </div>
  );
};

const CourseModal = ({ open, onClose, onSubmit }) => {
  const [form, setForm] = useState({ title: '', description: '', level: 'beginner', assetco: 'General', required: false, passingScore: 70 });
  return (
    <Modal open={open} onClose={onClose} title="Create Course" subtitle="Course setup stays tied to the current learning API.">
      <div className="space-y-4">
        <div><label className="label">Course Title</label><input className="input-base" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} /></div>
        <div><label className="label">Description</label><textarea className="input-base min-h-28" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} /></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="label">Level</label><select className="input-base" value={form.level} onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value }))}>{['beginner', 'intermediate', 'expert'].map((level) => <option key={level} value={level}>{level}</option>)}</select></div>
          <div><label className="label">Department</label><input className="input-base" value={form.assetco} onChange={(e) => setForm((prev) => ({ ...prev, assetco: e.target.value }))} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-text-1)' }}><input type="checkbox" checked={form.required} onChange={(e) => setForm((prev) => ({ ...prev, required: e.target.checked }))} /> Required</label>
        <div><label className="label">Passing Score</label><input type="number" className="input-base" value={form.passingScore} onChange={(e) => setForm((prev) => ({ ...prev, passingScore: Number(e.target.value) }))} /></div>
        <button className="btn-primary w-full" onClick={() => { if (!form.title) return toast.error('Title required'); onSubmit(form); }}>Create Course</button>
      </div>
    </Modal>
  );
};

export default Training;
