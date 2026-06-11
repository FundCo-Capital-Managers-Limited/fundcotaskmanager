import React, { useEffect, useState } from 'react';
import { FileText, ShieldCheck } from 'lucide-react';
import { Panel } from '../components/ui.jsx';
import AdminReportStudio from './AdminReportStudio.jsx';
import ReportReviewQueue from './ReportReviewQueue.jsx';

const REPORT_TABS = [
  { key: 'my-reports', label: 'My Reports', icon: FileText },
  { key: 'review-queue', label: 'Review Queue', icon: ShieldCheck },
];

const REPORTS_ADMIN_TAB_KEY = 'fundco-admin-reports-workspace-tab-v1';

const readSavedTab = () => {
  try {
    return localStorage.getItem(REPORTS_ADMIN_TAB_KEY) || 'my-reports';
  } catch {
    return 'my-reports';
  }
};

const Reports = () => {
  const [tab, setTab] = useState(readSavedTab);

  useEffect(() => {
    try {
      localStorage.setItem(REPORTS_ADMIN_TAB_KEY, tab);
    } catch {
      // ignore storage write failures
    }
  }, [tab]);

  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-wrap gap-2">
          {REPORT_TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
              style={tab === item.key
                ? {
                    borderColor: 'var(--brand-primary)',
                    backgroundColor: 'var(--brand-light)',
                    color: 'var(--brand-primary)',
                  }
                : {
                    borderColor: 'var(--c-border)',
                    backgroundColor: 'var(--c-panel)',
                    color: 'var(--c-text-2)',
                  }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
      </Panel>

      {tab === 'my-reports' ? <AdminReportStudio /> : <ReportReviewQueue />}
    </div>
  );
};

export default Reports;



