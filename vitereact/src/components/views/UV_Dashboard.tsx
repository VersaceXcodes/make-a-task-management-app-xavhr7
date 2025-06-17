import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { use_app_store } from '@/store/main';
import { useNavigate } from 'react-router-dom';

interface SummaryStats {
  total_tasks: number;
  completed_percent: number;
  overdue_tasks: number;
  upcoming_deadlines_count: number;
}

interface ProgressBarItem {
  workspace_id: number | null;
  task_list_id: number | null;
  name: string;
  completed_percent: number;
}

interface QuickLink {
  label: string;
  filterParams: Record<string, any>;
}

interface DashboardData {
  summaryStats: SummaryStats;
  progressBars: ProgressBarItem[];
  quickLinks: QuickLink[];
}

// API fetch function for dashboard summary
const fetchDashboardSummary = async (token: string): Promise<DashboardData> => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  const { data } = await axios.get(`${baseUrl}/dashboard-summary`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  /* Normalize backend snake_case keys to camelCase as per datamap naming:
     { summary_stats, progress_bars, quick_links } -> { summaryStats, progressBars, quickLinks }
  */
  const normalizedData: DashboardData = {
    summaryStats: data.summary_stats ?? {
      total_tasks: 0,
      completed_percent: 0,
      overdue_tasks: 0,
      upcoming_deadlines_count: 0,
    },
    progressBars: data.progress_bars ?? [],
    quickLinks: data.quick_links ?? [],
  };
  return normalizedData;
};

const UV_Dashboard: React.FC = () => {
  const auth = use_app_store(state => state.auth);
  const navigate = useNavigate();

  // QuickLinks fixed as per datamap default in PRD
  const quickLinksDefault: QuickLink[] = [
    {
      label: 'Overdue Tasks',
      filterParams: { status: ['Pending', 'In Progress'], due_date_end: 'today' },
    },
    {
      label: "Today's Tasks",
      filterParams: { due_date_start: 'today', due_date_end: 'today' },
    },
  ];

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<DashboardData, Error>(
    ['dashboard_summary'],
    () => fetchDashboardSummary(auth.token),
    {
      enabled: auth.is_authenticated && auth.token.length > 0, // fetch only if authenticated and token present
      staleTime: 1000 * 60, // 1 minute cache
      retry: 1,
    }
  );

  // Use fallback quickLinks from datamap default if API returns empty or no quickLinks
  const quickLinks = data?.quickLinks && data.quickLinks.length > 0 ? data.quickLinks : quickLinksDefault;

  // Handler for clicking quick links or progress bars
  // Navigate to filtered task list view or fallback
  const onNavigateFilteredTaskList = (item: QuickLink | ProgressBarItem) => {
    if ('filterParams' in item && item.filterParams) {
      // QuickLink navigation: Navigate to a generic filtered tasks page (no task_list_id)
      const filterParams: Record<string, any> = {};
      for (const key in item.filterParams) {
        const val = item.filterParams[key];
        filterParams[key] = Array.isArray(val) ? val.join(',') : val;
      }
      const searchParams = new URLSearchParams(filterParams);
      // Navigate to a generic /tasks route for filtered tasks as task_list_id unknown
      navigate(`/tasks?${searchParams.toString()}`);
      return;
    }

    // ProgressBar navigation: prefer task_list_id, else workspace_id to filtered list
    let taskListId: number | null = null;
    if ('task_list_id' in item && item.task_list_id !== null) {
      taskListId = item.task_list_id;
    }

    if (taskListId !== null) {
      // No filter params expected for progress bar clicks per datamap
      navigate(`/lists/${taskListId}`);
      return;
    }

    // Fallback: if workspace_id present but no task_list_id, we can navigate to a generic workspace lists
    if ('workspace_id' in item && item.workspace_id !== null) {
      // Navigate to workspace page or lists filter (assuming /workspaces/:id/lists or /lists?workspace=ID)
      navigate(`/lists?workspace_id=${item.workspace_id}`);
      return;
    }
  };

  // Render UI in one big JSX block
  return (
    <>
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="mb-4">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Overview of your tasks, projects and priorities.
          </p>
        </header>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-16 text-gray-700 dark:text-gray-300" role="status" aria-live="polite">
            Loading dashboard data...
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="text-center py-16 text-red-600 dark:text-red-400" role="alert">
            Error loading dashboard: {error?.message}
            <button
              className="ml-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              onClick={() => refetch()}
              type="button"
              aria-label="Retry loading dashboard data"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main content */}
        {!isLoading && !isError && data && (
          <>
            {/* Summary Stats */}
            <section
              aria-label="Summary statistics"
              className="grid grid-cols-1 sm:grid-cols-4 gap-6"
            >
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 flex flex-col justify-center items-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Tasks</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {data.summaryStats.total_tasks}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 flex flex-col justify-center items-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {data.summaryStats.completed_percent.toFixed(0)}%
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 flex flex-col justify-center items-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Overdue Tasks</p>
                <p className="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400 flex items-center space-x-2">
                  <svg
                    className="w-6 h-6 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    role="img"
                  >
                    <title>Overdue Tasks Alert</title>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{data.summaryStats.overdue_tasks}</span>
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 flex flex-col justify-center items-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Upcoming Deadlines</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {data.summaryStats.upcoming_deadlines_count}
                </p>
              </div>
            </section>

            {/* Progress Bars */}
            <section aria-label="Progress bars for workspaces and lists" className="mt-12 space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Progress by Workspace / List</h2>
              {data.progressBars.length === 0 && (
                <p className="text-gray-600 dark:text-gray-400">No workspaces or lists to show progress.</p>
              )}
              <div className="space-y-4">
                {data.progressBars.map((bar) => {
                  const progressPercent = Math.min(Math.max(bar.completed_percent, 0), 100);
                  return (
                    <button
                      key={
                        bar.task_list_id !== null
                          ? `list-${bar.task_list_id}`
                          : bar.workspace_id !== null
                          ? `ws-${bar.workspace_id}`
                          : `unknown-${bar.name}`
                      }
                      type="button"
                      onClick={() =>
                        onNavigateFilteredTaskList(bar)
                      }
                      className="w-full text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                      aria-label={`Navigate to detailed view for ${bar.name} with completion ${progressPercent}%`}
                    >
                      <div className="mb-1 flex justify-between items-center">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{bar.name}</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {progressPercent.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-4 transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Quick Links */}
            <section aria-label="Quick links to task filters" className="mt-12">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Access</h2>
              <div className="flex flex-wrap gap-4">
                {quickLinks.map((link, idx) => {
                  return (
                    <button
                      key={`quick-link-${idx}`}
                      type="button"
                      onClick={() => onNavigateFilteredTaskList(link)}
                      className="px-5 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label={`Navigate to ${link.label}`}
                    >
                      {link.label}
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
};

export default UV_Dashboard;