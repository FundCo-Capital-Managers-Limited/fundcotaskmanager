import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { MessageCircleMore, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import userApi from '../utils/userApi.js';
import {
  EmptyState,
  FilterChip,
  LoadingScreen,
  PageHeader,
  Panel,
  SearchInput,
  StatCard,
} from '../components/ui.jsx';

const Feedbacks = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await userApi.get('/api/feedback', { params: { search, category } });
      setFeedbacks(data.feedbacks || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchFeedbacks();
    }
  }, [fetchFeedbacks, user?.role]);

  const stats = useMemo(() => {
    const byCategory = feedbacks.reduce((accumulator, item) => {
      const key = item.category || 'Other';
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});
    return {
      total: feedbacks.length,
      feature: byCategory['Feature Request'] || 0,
      bugs: byCategory['Bug Report'] || 0,
      usability: byCategory['Usability Issue'] || 0,
    };
  }, [feedbacks]);

  if (user?.role !== 'admin') {
    return (
      <div className="page-shell">
        <EmptyState icon={MessageCircleMore} title="Unavailable" description="Only super admins can review feedback submitted by users." />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="User Feedback"
        description="Review what people are asking for, where usability is weak, and which issues keep coming up."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={stats.total} icon={MessageCircleMore} tone="var(--brand-primary)" />
        <StatCard label="Feature Requests" value={stats.feature} icon={MessageCircleMore} tone="var(--brand-secondary)" />
        <StatCard label="Bug Reports" value={stats.bugs} icon={MessageCircleMore} tone="#dc2626" />
        <StatCard label="Usability Issues" value={stats.usability} icon={MessageCircleMore} tone="#d97706" />
      </div>

      <Panel>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search feedback..." icon={Search} />
          <div className="flex flex-wrap gap-2">
            {['', 'Feature Request', 'Bug Report', 'Usability Issue', 'General Feedback', 'Other'].map((item) => (
              <FilterChip key={item || 'all'} active={category === item} onClick={() => setCategory(item)}>
                {item || 'All'}
              </FilterChip>
            ))}
          </div>
        </div>
      </Panel>

      {loading ? (
        <LoadingScreen height="18rem" />
      ) : feedbacks.length === 0 ? (
        <EmptyState icon={MessageCircleMore} title="No feedback found" description="Feedback from the user app will show up here." />
      ) : (
        <Panel title="Feedback queue" subtitle={`${feedbacks.length} feedback item${feedbacks.length === 1 ? '' : 's'} visible`}>
          <div className="space-y-3">
            {feedbacks.map((item) => (
              <div key={item._id} className="card p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="badge" style={{ background: 'var(--c-panel-subtle)', color: 'var(--c-text-soft)' }}>{item.category}</span>
                    </div>
                    <h3 className="text-base font-bold" style={{ color: 'var(--c-text-0)' }}>
                      {item.userId ? `${item.userId.firstName || ''} ${item.userId.lastName || ''}`.trim() || item.userId.email : 'Unknown user'}
                    </h3>
                    <p className="mt-1 text-sm" style={{ color: 'var(--c-text-3)' }}>
                      {item.userId?.position || item.userId?.unitSector || item.userId?.email || 'No extra profile context'}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6" style={{ color: 'var(--c-text-1)' }}>{item.feedback}</p>
                  </div>
                  <div className="shrink-0 text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>
                    {format(new Date(item.timestamp || item.createdAt), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
};

export default Feedbacks;



