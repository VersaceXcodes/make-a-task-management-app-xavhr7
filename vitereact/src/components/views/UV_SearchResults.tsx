import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { use_app_store } from '@/store/main';

interface SearchTaskTag {
  tag_id: number;
  tag_name: string;
}

interface SearchAssignedUser {
  user_id: string;
  full_name: string | null;
  email: string;
}

interface SearchTask {
  task_id: number;
  task_list_id: number;
  title: string;
  description: string | null;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'In Progress' | 'Completed';
  due_datetime: string | null;
  tags: SearchTaskTag[];
  assigned_users: SearchAssignedUser[];
}

interface TaskList {
  task_list_id: number;
  list_name: string;
  workspace_id: number | null;
  user_id: string | null;
  position_order: number;
  incomplete_task_count: number;
}

const SORT_BY_OPTIONS = [
  { value: 'custom', label: 'Custom' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'priority', label: 'Priority' },
  { value: 'created_at', label: 'Creation Date' },
];

const SORT_ORDER_OPTIONS = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const fetchSearchResults = async (
  q: string,
  workspace_id: number | null,
  sort_by: string | null,
  sort_order: string | null,
  page: number,
  page_size: number,
  token: string
): Promise<{ tasks: SearchTask[]; total_count: number; page: number; page_size: number }> => {
  if (!q.trim()) {
    return { tasks: [], total_count: 0, page: 1, page_size: page_size };
  }
  const params: Record<string, any> = { q, page, page_size };
  if (workspace_id !== null) params.workspace_id = workspace_id;
  if (sort_by) params.sort_by = sort_by;
  if (sort_order) params.sort_order = sort_order;

  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  const res = await axios.get(`${baseURL}/search/tasks`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });

  return res.data;
};

const UV_SearchResults: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const token = use_app_store(state => state.auth.token);
  const task_lists = use_app_store(state => state.task_lists);
  const workspaces = use_app_store(state => state.workspaces);

  // Extract query params with types and fallbacks
  const query_q = searchParams.get('q') || '';
  const query_workspace_id = searchParams.get('workspace_id');
  const workspace_id_num =
    query_workspace_id && !isNaN(Number(query_workspace_id)) ? Number(query_workspace_id) : null;

  const query_sort_by = searchParams.get('sort_by');
  const query_sort_order = searchParams.get('sort_order');

  const query_page = searchParams.get('page');
  const page_num = query_page && !isNaN(Number(query_page)) && Number(query_page) > 0 ? Number(query_page) : 1;

  const query_page_size = searchParams.get('page_size');
  const page_size_num =
    query_page_size && !isNaN(Number(query_page_size)) && PAGE_SIZE_OPTIONS.includes(Number(query_page_size))
      ? Number(query_page_size)
      : 25;

  // Local controlled state for search input to allow user typing without immediate URL change
  const [searchQueryInput, setSearchQueryInput] = useState(query_q);

  // Sync local input with URL param if URL changes (e.g., browser back)
  useEffect(() => {
    setSearchQueryInput(query_q);
  }, [query_q]);

  // React Query hook for fetching search results:
  const {
    data,
    isLoading,
    isError,
    error,
    refetch: refetchSearch,
    isFetching,
  } = useQuery(
    ['search_tasks', { q: query_q, workspace_id: workspace_id_num, sort_by: query_sort_by, sort_order: query_sort_order, page: page_num, page_size: page_size_num }],
    () =>
      fetchSearchResults(query_q, workspace_id_num, query_sort_by, query_sort_order, page_num, page_size_num, token),
    {
      enabled: query_q.trim() !== '',
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000,
    }
  );

  // Group tasks by task_list_id for display
  // Structure: { [task_list_id]: SearchTask[] }
  const groupedTasks = useMemo(() => {
    if (!data?.tasks) return {};
    return data.tasks.reduce<Record<number, SearchTask[]>>((acc, task) => {
      if (!acc[task.task_list_id]) acc[task.task_list_id] = [];
      acc[task.task_list_id].push(task);
      return acc;
    }, {});
  }, [data]);

  // Get task list details for headers from global store
  // We will use task_lists from global state to display task list name; fallback name if not found.

  // Actions:

  // On search input change: update local input state
  const onSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQueryInput(e.target.value);
  };

  // On Enter in search input or after some debounce, update URL param 'q'.
  // For simplicity update on Enter or on blur events here.
  const onSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applySearchQuery(searchQueryInput);
    }
  };

  const onSearchInputBlur = () => {
    // Update only if different
    if (searchQueryInput !== query_q) {
      applySearchQuery(searchQueryInput);
    }
  };

  const applySearchQuery = (newQuery: string) => {
    const trimmed = newQuery.trim();
    if (trimmed === '') {
      clearSearch();
      return;
    }
    // Update 'q' param and reset page to 1
    const newParams = new URLSearchParams(searchParams);
    newParams.set('q', trimmed);
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  // On filter change (workspace, sort_by, sort_order, page, page_size)
  // Update the corresponding query params and reset page to 1 for workspace/sort-by changes
  const onWorkspaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const newParams = new URLSearchParams(searchParams);
    if (val === '') {
      newParams.delete('workspace_id');
    } else {
      newParams.set('workspace_id', val);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const onSortByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const newParams = new URLSearchParams(searchParams);
    if (val === '' || val === 'null') {
      newParams.delete('sort_by');
    } else {
      newParams.set('sort_by', val);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const onSortOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const newParams = new URLSearchParams(searchParams);
    if (val === '' || val === 'null') {
      newParams.delete('sort_order');
    } else {
      newParams.set('sort_order', val);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const onPageChange = (newPage: number) => {
    if (newPage < 1) return;
    const lastPage = data ? Math.ceil(data.total_count / data.page_size) : 1;
    if (newPage > lastPage) return;
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
  };

  const onPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = Number(e.target.value);
    if (!PAGE_SIZE_OPTIONS.includes(val)) return;
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page_size', val.toString());
    // Reset page on page size change
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  // Clear search resets all filters and query
  const clearSearch = () => {
    setSearchQueryInput('');
    setSearchParams(new URLSearchParams()); // clear all params
  };

  // Navigation to task detail view
  const navigateToTaskDetail = (taskId: number) => {
    navigate(`/tasks/${taskId}`);
  };

  // Navigation to task list view
  const navigateToTaskList = (taskListId: number) => {
    navigate(`/lists/${taskListId}`);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Search Tasks</h1>

        {/* Search input and clear button */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <input
            type="search"
            className="flex-grow rounded border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            placeholder="Search by task title or description..."
            value={searchQueryInput}
            onChange={onSearchInputChange}
            onKeyDown={onSearchInputKeyDown}
            onBlur={onSearchInputBlur}
            aria-label="Search input"
            autoFocus
          />
          <button
            type="button"
            onClick={clearSearch}
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:outline-none"
            aria-label="Clear search"
          >
            Clear
          </button>
        </div>

        {/* Filters panel */}
        <div className="flex flex-wrap gap-4 items-center mb-6 text-gray-800 dark:text-gray-300">
          {/* Workspace filter */}
          <label className="flex flex-col text-sm w-48">
            <span className="mb-1 font-semibold">Workspace</span>
            <select
              value={workspace_id_num !== null ? workspace_id_num.toString() : ''}
              onChange={onWorkspaceChange}
              className="rounded border border-gray-300 px-2 py-1 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              aria-label="Filter by workspace"
            >
              <option value="">All Workspaces / Personal</option>
              {workspaces.map(ws => (
                <option key={ws.workspace_id} value={ws.workspace_id}>
                  {ws.workspace_name} {ws.is_personal ? '(Personal)' : ''}
                </option>
              ))}
            </select>
          </label>

          {/* Sort by */}
          <label className="flex flex-col text-sm w-48">
            <span className="mb-1 font-semibold">Sort By</span>
            <select
              value={query_sort_by || ''}
              onChange={onSortByChange}
              className="rounded border border-gray-300 px-2 py-1 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              aria-label="Sort by"
            >
              <option value="">Default (Custom)</option>
              {SORT_BY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {/* Sort order */}
          <label className="flex flex-col text-sm w-48">
            <span className="mb-1 font-semibold">Order</span>
            <select
              value={query_sort_order || ''}
              onChange={onSortOrderChange}
              className="rounded border border-gray-300 px-2 py-1 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              aria-label="Sort order"
            >
              <option value="">Default (Asc)</option>
              {SORT_ORDER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {/* Page size */}
          <label className="flex flex-col text-sm w-32">
            <span className="mb-1 font-semibold">Page Size</span>
            <select
              value={page_size_num}
              onChange={onPageSizeChange}
              className="rounded border border-gray-300 px-2 py-1 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              aria-label="Page size"
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Results section */}

        {isLoading || isFetching ? (
          <p className="text-gray-600 dark:text-gray-300">Loading search results...</p>
        ) : isError ? (
          <p className="text-red-600 dark:text-red-500">Error loading search results</p>
        ) : !query_q.trim() ? (
          <p className="text-gray-600 dark:text-gray-300">Please enter a search keyword above.</p>
        ) : data?.tasks.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-300">No tasks found matching your search.</p>
        ) : (
          Object.entries(groupedTasks).map(([taskListIdStr, tasks]) => {
            const taskListId = Number(taskListIdStr);
            const listInfo = task_lists.find(l => l.task_list_id === taskListId);
            const listName = listInfo ? listInfo.list_name : `List #${taskListId}`;

            return (
              <section key={taskListId} className="mb-8">
                <h2 className="text-xl font-semibold text-blue-700 dark:text-blue-400 mb-2 cursor-pointer hover:underline" 
                onClick={() => navigateToTaskList(taskListId)}>
                  {listName}
                </h2>
                <div className="space-y-3">
                  {tasks.map(task => (
                    <div
                      key={task.task_id}
                      className="p-4 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow hover:shadow-lg cursor-pointer"
                      onClick={() => navigateToTaskDetail(task.task_id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          navigateToTaskDetail(task.task_id);
                        }
                      }}
                      aria-label={`Open task detail for ${task.title}`}
                    >
                      <div className="flex justify-between items-start space-x-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">{task.title}</h3>
                          {task.description ? (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{task.description}</p>
                          ) : null}
                        </div>
                        <div className="text-sm flex-shrink-0">
                          <span
                            className={`inline-block rounded px-2 py-1 font-semibold text-xs ${
                              task.priority === 'High'
                                ? 'bg-red-200 text-red-800'
                                : task.priority === 'Medium'
                                ? 'bg-yellow-200 text-yellow-800'
                                : 'bg-green-200 text-green-800'
                            }`}
                            aria-label={`Priority: ${task.priority}`}
                          >
                            {task.priority}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-700 dark:text-gray-400">
                        <div>
                          Status: <span className="font-semibold">{task.status}</span>
                        </div>
                        {task.due_datetime ? (
                          <div>
                            Due: <time dateTime={task.due_datetime}>{new Date(task.due_datetime).toLocaleString()}</time>
                          </div>
                        ) : null}
                        {task.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1" aria-label="Tags">
                            {task.tags.map(tag => (
                              <span
                                key={tag.tag_id}
                                className="bg-indigo-200 dark:bg-indigo-700 text-indigo-800 dark:text-indigo-300 rounded px-2 py-0.5"
                              >
                                {tag.tag_name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {task.assigned_users.length > 0 ? (
                          <div className="flex flex-wrap gap-2 items-center" aria-label="Assigned Users">
                            {task.assigned_users.map(user => (
                              <abbr
                                key={user.user_id}
                                title={user.full_name ? `${user.full_name} (${user.email})` : user.email}
                                className="text-blue-700 dark:text-blue-400 underline cursor-help"
                              >
                                {user.full_name || user.email}
                              </abbr>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}

        {/* Pagination controls */}
        {data && data.total_count > data.page_size && (
          <nav
            className="flex justify-center items-center space-x-4 mt-6"
            aria-label="Pagination navigation"
          >
            <button
              type="button"
              onClick={() => onPageChange(page_num - 1)}
              disabled={page_num <= 1}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-400">
              Page {page_num} of {Math.max(1, Math.ceil(data.total_count / data.page_size))}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(page_num + 1)}
              disabled={page_num >= Math.ceil(data.total_count / data.page_size)}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </nav>
        )}
      </div>
    </>
  );
};

export default UV_SearchResults;