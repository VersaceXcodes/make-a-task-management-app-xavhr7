import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { use_app_store } from '@/store/main';

interface TaskListMetadata {
  task_list_id: number;
  list_name: string;
  workspace_id: number | null;
  user_id: string | null;
  position_order: number;
  incomplete_task_count: number;
}

type TaskPriority = 'Low' | 'Medium' | 'High';
type TaskStatus = 'Pending' | 'In Progress' | 'Completed';

interface Tag {
  tag_id: number;
  tag_name: string;
}

interface AssignedUser {
  user_id: string;
  full_name: string | null;
  email: string;
}

interface Task {
  task_id: number;
  task_list_id: number;
  parent_task_id: number | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  due_datetime: string | null;
  estimated_effort_mins: number | null;
  status: TaskStatus;
  created_by_user_id: string;
  created_at: string;
  updated_at: string | null;
  is_completed: boolean;
  position_order: number;
  is_active: boolean;
  recurring_pattern: string | null;
  recurrence_end_date: string | null;
  recurrence_count: number | null;
  tags: Tag[];
  assigned_users: AssignedUser[];
}

interface Filters {
  status: TaskStatus[];
  tags: number[];
  assigned_user_ids: string[];
  due_date_start: string | null;
  due_date_end: string | null;
}

interface Sorting {
  sort_by: 'manual' | 'deadline' | 'priority' | 'created_at';
  sort_order: 'asc' | 'desc';
}

interface BulkUpdatePayload {
  task_ids: number[];
  status?: TaskStatus;
  is_completed?: boolean;
  is_active?: boolean;
  add_tag_ids?: number[];
  remove_tag_ids?: number[];
  assign_user_ids?: string[];
  unassign_user_ids?: string[];
}

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const fetchTaskLists = async (token: string): Promise<TaskListMetadata[]> => {
  const { data } = await axios.get<TaskListMetadata[]>(`${BASE_URL}/task_lists`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

const fetchTasks = async (
  token: string,
  task_list_id: number,
  filters: Filters,
  sorting: Sorting,
  page: number,
  page_size: number
): Promise<{ tasks: Task[]; total_count: number }> => {
  // Backend expects arrays as array parameters with style=form and explode=false (comma separated)
  // axios default will serialize arrays with same key repeated (explode=true) which backend may not expect
  // We manually serialize arrays into comma-separated strings for tags and assigned_user_ids

  const params: Record<string, any> = { task_list_id, page, page_size };

  if (filters.status && filters.status.length > 0) {
    params.status = filters.status;
  }
  if (filters.tags && filters.tags.length > 0) {
    // Provide as array for status, tags, assigned_user_ids (will be joined below)
    params.tags = filters.tags;
  }
  if (filters.assigned_user_ids && filters.assigned_user_ids.length > 0) {
    params.assigned_user_ids = filters.assigned_user_ids;
  }
  if (filters.due_date_start) params.due_date_start = filters.due_date_start;
  if (filters.due_date_end) params.due_date_end = filters.due_date_end;

  // Map sorting 'manual' to backend expected 'custom'
  let sort_by_param = sorting.sort_by === 'manual' ? 'custom' : sorting.sort_by;

  params.sort_by = sort_by_param;
  params.sort_order = sorting.sort_order;

  // Manually serialize arrays to comma-separated string for correct API format
  // axios paramsSerializer could also be used but keeping manual for clarity
  // Override params before request
  const serializedParams: Record<string, any> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length === 0) return; // skip empty arrays
      serializedParams[key] = value.join(',');
    } else if (value !== undefined && value !== null) {
      serializedParams[key] = value;
    }
  });

  const { data } = await axios.get<{ tasks: Task[]; total_count: number }>(
    `${BASE_URL}/tasks`,
    {
      params: serializedParams,
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return data;
};

const bulkUpdateTasks = async (
  token: string,
  payload: BulkUpdatePayload
): Promise<{ updated_tasks: Task[] }> => {
  const { data } = await axios.post<{ updated_tasks: Task[] }>(
    `${BASE_URL}/tasks/bulk_update`,
    payload,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return data;
};

const undoLastAction = async (token: string, undo_id: number): Promise<void> => {
  await axios.post(
    `${BASE_URL}/undo`,
    { undo_id },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
};

const updateTask = async (
  token: string,
  task_id: number,
  updateFields: Partial<Task>
): Promise<Task> => {
  const { data } = await axios.put<Task>(
    `${BASE_URL}/tasks/${task_id}`,
    updateFields,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
};

const createTask = async (
  token: string,
  taskData: Partial<Task>
): Promise<Task> => {
  const { data } = await axios.post<Task>(
    `${BASE_URL}/tasks`,
    taskData,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
};

const fetchTags = async (
  token: string,
  workspace_id: number | null,
  user_id: string | null
): Promise<Tag[]> => {
  const params = workspace_id ? { workspace_id } : user_id ? { user_id } : {};
  const { data } = await axios.get<Tag[]>(`${BASE_URL}/tags`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return data;
};

const fetchAssignedUsers = async (
  token: string,
  workspace_id: number | null,
  user_id: string | null
): Promise<AssignedUser[]> => {
  /*
    Assigned users are provided on tasks. 
    For filter dropdown, fetch all users in the workspace or personal user only.
    Since no dedicated API for users, here we attempt to scatter from tasks tags or use workspace members.
    For MVP, rely on assigned_users from tasks or global store if necessary.
  */
  // To keep simple, we will gather from all tasks later or from global Zustand store.
  return [];
};

const parseArrayParam = <T = string>(
  param: string | null
): T[] => {
  if (!param) return [];
  return param.split(',').map((s) => s.trim()).filter((s) => s !== '') as unknown as T[];
};

const msToDateInput = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const dateInputToISO = (dateStr: string): string | null => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
};

const formatDateTime = (
  isoStr: string | null,
  timezoneOffsetMins: number
): string => {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '-';

  const localTime = new Date(d.getTime() + timezoneOffsetMins * 60 * 1000);

  return localTime.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const priorityColorMap: Record<TaskPriority, string> = {
  High: 'bg-red-500',
  Medium: 'bg-yellow-400',
  Low: 'bg-green-400',
};

const statusOptions: TaskStatus[] = ['Pending', 'In Progress', 'Completed'];
const priorityOptions: TaskPriority[] = ['Low', 'Medium', 'High'];
const sortingOptions: Sorting['sort_by'][] = [
  'manual',
  'deadline',
  'priority',
  'created_at',
];

// Helper to build nested task tree from flat tasks array
function buildTaskTree(tasks: Task[]): Task[] {
  const taskMap = new Map<number, Task & { children: Task[] }>();
  tasks.forEach((task) => taskMap.set(task.task_id, { ...task, children: [] }));

  const roots: (Task & { children: Task[] })[] = [];

  taskMap.forEach((task) => {
    if (task.parent_task_id && taskMap.has(task.parent_task_id)) {
      const parent = taskMap.get(task.parent_task_id)!;
      parent.children.push(task);
    } else {
      roots.push(task);
    }
  });

  // Sort children by position_order ascending
  function sortChildren(task: Task & { children: Task[] }) {
    task.children.sort((a, b) => a.position_order - b.position_order);
    task.children.forEach(sortChildren);
  }

  roots.forEach(sortChildren);
  // Sort roots as well
  roots.sort((a, b) => a.position_order - b.position_order);

  return roots;
}

// The entire component as one single big render block
const UV_ToDoListView: React.FC = () => {
  // Zustand global states
  const token = use_app_store((s) => s.auth.token);
  const user_profile = use_app_store((s) => s.user_profile);
  const user_setting = use_app_store((s) => s.user_setting);
  const workspaces = use_app_store((s) => s.workspaces);
  const task_lists = use_app_store((s) => s.task_lists);
  const set_tasks = use_app_store((s) => s.set_tasks);
  const tasksStore = use_app_store((s) => s.tasks);
  const selected_tasks = use_app_store((s) => s.selected_tasks);
  const set_selected_tasks = use_app_store((s) => s.set_selected_tasks);
  const undoEntry = use_app_store((s) => s.undo.last_action);
  const set_undo = use_app_store((s) => s.set_undo);

  // route params for task_list_id
  const { task_list_id: task_list_id_param } = useParams<{ task_list_id: string }>();
  const task_list_id = Number(task_list_id_param || 0);

  // React router navigation + search params for filters, sorting, and pagination
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Component local state for UI toggles
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);
  const [multiSelectMode, setMultiSelectMode] = useState<boolean>(false);
  const [bulkActionUndoToastVisible, setBulkActionUndoToastVisible] = useState<boolean>(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState<boolean>(false);

  // Pagination from query params or default
  const page = Number(searchParams.get('page') || '1');
  const page_size = Number(searchParams.get('page_size') || '25');

  // Parsing sorting from URL params, with correct default values
  const sort_by_raw = searchParams.get('sort_by');
  const sort_order_raw = searchParams.get('sort_order');
  const sort_by = (sort_by_raw && sortingOptions.includes(sort_by_raw as Sorting['sort_by']))
    ? (sort_by_raw as Sorting['sort_by'])
    : 'manual';
  const sort_order = sort_order_raw === 'desc' ? 'desc' : 'asc';

  // Parsing filters from URL params
  const status_filter = parseArrayParam<TaskStatus>(searchParams.get('status'));
  const tags_filter = parseArrayParam<number>(searchParams.get('tags')).map((id) => Number(id)).filter((id) => !isNaN(id));
  const assigned_user_ids_filter = parseArrayParam<string>(searchParams.get('assigned_user_ids'));
  const due_date_start_filter_raw = searchParams.get('due_date_start');
  const due_date_end_filter_raw = searchParams.get('due_date_end');
  const due_date_start_filter = due_date_start_filter_raw ? due_date_start_filter_raw : null;
  const due_date_end_filter = due_date_end_filter_raw ? due_date_end_filter_raw : null;

  // Filters as object
  const filters: Filters = {
    status: status_filter,
    tags: tags_filter,
    assigned_user_ids: assigned_user_ids_filter,
    due_date_start: due_date_start_filter,
    due_date_end: due_date_end_filter,
  };

  // Sorting as object
  const sorting: Sorting = { sort_by, sort_order };

  // Zustand task list metadata from global task_lists array
  const taskListMetadataFromStore = task_lists.find((l) => l.task_list_id === task_list_id) || null;

  // React Query client for cache invalidation
  const queryClient = useQueryClient();

  // Fetch task list metadata with React Query to ensure fresh latest data
  const {
    data: taskListMetadata,
    isLoading: isLoadingTaskListMetadata,
    isError: isErrorTaskListMetadata,
    error: errorTaskListMetadata,
    refetch: refetchTaskListMetadata,
  } = useQuery<TaskListMetadata, Error>(
    ['task_list_metadata', task_list_id],
    async () => {
      // Fetch all task lists and find desired one
      const lists = await fetchTaskLists(token);
      const found = lists.find((l) => l.task_list_id === task_list_id);
      if (!found) throw new Error('Task list not found');
      return found;
    },
    {
      enabled: task_list_id > 0,
      initialData: taskListMetadataFromStore || undefined,
      staleTime: 1000 * 60 * 5,
      onSuccess: (data) => {
        // Optionally sync to global task_lists?
      },
    }
  );

  // Fetch tasks according to params filters, sorting, pagination
  const {
    data: tasksData,
    isLoading: isLoadingTasks,
    isError: isErrorTasks,
    error: errorTasks,
    refetch: refetchTasks,
  } = useQuery<{ tasks: Task[]; total_count: number }, Error>(
    [
      'tasks',
      task_list_id,
      filters,
      sorting,
      page,
      page_size,
    ],
    () => fetchTasks(token, task_list_id, filters, sorting, page, page_size),
    {
      enabled: task_list_id > 0,
      keepPreviousData: true,
    }
  );

  // Derived nested tasks tree
  const tasksList = tasksData?.tasks || [];
  const tasksRootTree = useMemo(() => buildTaskTree(tasksList), [tasksList]);

  // To flatten tasks keys for selection or update easier (object keyed by task_id)
  const tasksMap = useMemo(() => {
    const map: Record<number, Task> = {};
    tasksList.forEach((t) => {
      map[t.task_id] = t;
    });
    return map;
  }, [tasksList]);

  // Tags & Assigned users lists for filter panel
  // For tags: fetch tags for current workspace or user (from metadata)
  const [tagsForFilter, setTagsForFilter] = useState<Tag[]>([]);
  // For assigned users: union of assigned_users from tasks
  const assignedUsersForFilter = useMemo(() => {
    const map = new Map<string, AssignedUser>();
    tasksList.forEach((task) => {
      task.assigned_users.forEach((au) => {
        if (!map.has(au.user_id)) {
          map.set(au.user_id, au);
        }
      });
    });
    return Array.from(map.values());
  }, [tasksList]);

  // Fetch tags for current scope (workspace or user)
  useEffect(() => {
    if (!token || !taskListMetadata) return;
    let active = true;
    fetchTags(token, taskListMetadata.workspace_id, taskListMetadata.user_id).then((tags) => {
      if (!active) return;
      setTagsForFilter(tags);
    }).catch(() => {
      setTagsForFilter([]);
    });
    return () => { active = false };
  }, [token, taskListMetadata]);

  // Multi-select handlers
  const toggleMultiSelectMode = () => {
    setMultiSelectMode((v) => {
      if (v) set_selected_tasks([]);
      return !v;
    });
  };

  const isTaskSelected = (task_id: number): boolean => selected_tasks.includes(task_id);

  const toggleTaskSelected = (task_id: number) => {
    if (!multiSelectMode) return;
    if (isTaskSelected(task_id)) {
      set_selected_tasks(selected_tasks.filter((id) => id !== task_id));
    } else {
      set_selected_tasks([...selected_tasks, task_id]);
    }
  };

  // Create mutations for bulk update, undo, single updates

  const mutationBulkUpdate = useMutation(
    (payload: BulkUpdatePayload) => bulkUpdateTasks(token, payload),
    {
      onSuccess: () => {
        // Update task cache
        queryClient.invalidateQueries(['tasks', task_list_id]);
        // Clear selection, hide toast
        set_selected_tasks([]);
        setBulkActionUndoToastVisible(true);
        // set last undo via payload returned? Assume we get undo id somehow. We'll not get undo id from bulk update so no undo available here except soft delete. Only soft delete undo handled separately.
        // Curl or backend does bulk update including delete; we rely on global undo store set by socket or elsewhere.
      },
      onError: (e) => {
        alert(`Bulk action failed: ${(e as Error).message}`);
      },
    }
  );

  const mutationUndo = useMutation<void, any, number>(
    (undo_id) => undoLastAction(token, undo_id),
    {
      onSuccess: () => {
        setBulkActionUndoToastVisible(false);
        set_undo({ last_action: null });
        // Refetch tasks and metadata
        queryClient.invalidateQueries(['tasks', task_list_id]);
        queryClient.invalidateQueries(['task_list_metadata', task_list_id]);
      },
      onError: (e) => alert(`Undo failed: ${(e as Error).message}`),
    }
  );

  const mutationToggleCompletion = useMutation(
    ({ task_id, is_completed }: { task_id: number; is_completed: boolean }) =>
      updateTask(token, task_id, {
        is_completed,
        status: is_completed ? 'Completed' : 'Pending',
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['tasks', task_list_id]);
      },
      onError: (e) => alert(`Failed to toggle task completion: ${(e as Error).message}`),
    }
  );

  // Mutation for dragging and dropping sorting
  const mutationUpdateOrder = useMutation(
    (updates: { task_id: number; position_order: number }[]) => {
      // For each task, send PUT /tasks/:task_id with position_order
      // For performance in MVP, send sequentially; can be optimized
      return Promise.all(
        updates.map(({ task_id, position_order }) =>
          updateTask(token, task_id, { position_order })
        )
      );
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['tasks', task_list_id]);
      },
      onError: (e) => alert(`Failed to update task order: ${(e as Error).message}`),
    }
  );

  // Handle Add Task modal form fields & submit
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState<string | null>(null);
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('Medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('');
  const [newTaskDueTime, setNewTaskDueTime] = useState<string>('');

  // Create task mutation
  const mutationCreateTask = useMutation(
    () => {
      let due_datetime_iso: string | null = null;
      if (newTaskDueDate) {
        if (newTaskDueTime) {
          // Compose local datetime string
          // Parse as local and get ISO string
          const localDateTime = new Date(`${newTaskDueDate}T${newTaskDueTime}:00`);
          if (!isNaN(localDateTime.getTime())) {
            due_datetime_iso = localDateTime.toISOString();
          }
        } else {
          const d = new Date(newTaskDueDate);
          if (!isNaN(d.getTime())) {
            due_datetime_iso = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
          }
        }
      }
      return createTask(token, {
        task_list_id,
        title: newTaskTitle.trim(),
        description: newTaskDescription || null,
        priority: newTaskPriority,
        due_datetime: due_datetime_iso,
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['tasks', task_list_id]);
        setIsAddTaskModalOpen(false);
        setNewTaskTitle('');
        setNewTaskDescription(null);
        setNewTaskPriority('Medium');
        setNewTaskDueDate('');
        setNewTaskDueTime('');
      },
      onError: (e) => alert(`Failed to create task: ${(e as Error).message}`),
    }
  );

  // Handle drag and drop sorting state
  // For simplicity, minimal HTML5 drag & drop api

  // Dragged task id tracking
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);

  // Flattened tasks with indentation, to allow mapping subtasks in flat list with indentation level
  interface FlatTaskWithIndent extends Task {
    indentLevel: number;
  }

  function flattenTasks(tasks: (Task & { children?: Task[] })[], indent = 0): FlatTaskWithIndent[] {
    let result: FlatTaskWithIndent[] = [];
    tasks.forEach((task) => {
      result.push({ ...task, indentLevel: indent });
      if (task.children && task.children.length > 0) {
        result = result.concat(flattenTasks(task.children, indent + 1));
      }
    });
    return result;
  }

  const flatTasks = useMemo(() => flattenTasks(tasksRootTree), [tasksRootTree]);

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, task_id: number) {
    setDraggedTaskId(task_id);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires setData for drag to work
    e.dataTransfer.setData('text/plain', task_id.toString());
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, task_id: number) {
    e.preventDefault();
    if (draggedTaskId === null || draggedTaskId === task_id) return;

    // Find dragged task and target task indices in flatTasks
    const draggedIndex = flatTasks.findIndex((t) => t.task_id === draggedTaskId);
    const targetIndex = flatTasks.findIndex((t) => t.task_id === task_id);
    if (draggedIndex === -1 || targetIndex === -1) return;

    // Remove dragged task from current index and insert at target index
    let newOrder = [...flatTasks];
    const [movedTask] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, movedTask);

    // Note: We will flatten to task list ignoring indentation (no hierarchy change on drag)
    // Build array of { task_id, position_order } to update
    const updates = newOrder.map((task, idx) => ({
      task_id: task.task_id,
      position_order: idx,
    }));

    mutationUpdateOrder.mutate(updates);
    setDraggedTaskId(null);
  }

  // Toggle task completion checkbox handler
  function onToggleTaskCompletion(task: Task) {
    mutationToggleCompletion.mutate({
      task_id: task.task_id,
      is_completed: !task.is_completed,
    });
  }

  // Bulk action handlers
  function performBulkComplete() {
    mutationBulkUpdate.mutate({
      task_ids: selected_tasks,
      is_completed: true,
      status: 'Completed',
    });
  }

  function performBulkMarkIncomplete() {
    mutationBulkUpdate.mutate({
      task_ids: selected_tasks,
      is_completed: false,
      status: 'Pending',
    });
  }

  function performBulkDelete() {
    mutationBulkUpdate.mutate({
      task_ids: selected_tasks,
      is_active: false,
    });
  }

  // Undo last bulk destructive action handler
  function onUndo() {
    if (!undoEntry) return;
    mutationUndo.mutate(undoEntry.undo_id);
  }

  // Filters panel toggle
  function toggleFiltersPanel() {
    setIsFilterPanelOpen(!isFilterPanelOpen);
  }

  // Debounce utility for filter and sorting updates
  const debounce = (fn: (...args: any[]) => void, delay: number) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return (...args: any[]) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fn(...args);
        timeoutId = null;
      }, delay);
    };
  };

  const updateFiltersQueryRaw = useCallback(
    (newFilters: Partial<Filters>) => {
      // Compose new search params object from existing and new filters
      const updatedParams = new URLSearchParams(searchParams.toString());

      if (newFilters.status !== undefined) {
        if (newFilters.status.length === 0) updatedParams.delete('status');
        else updatedParams.set('status', newFilters.status.join(','));
      }
      if (newFilters.tags !== undefined) {
        if (newFilters.tags.length === 0) updatedParams.delete('tags');
        else updatedParams.set('tags', newFilters.tags.join(','));
      }
      if (newFilters.assigned_user_ids !== undefined) {
        if (newFilters.assigned_user_ids.length === 0) updatedParams.delete('assigned_user_ids');
        else updatedParams.set('assigned_user_ids', newFilters.assigned_user_ids.join(','));
      }
      if (newFilters.due_date_start !== undefined) {
        if (!newFilters.due_date_start) updatedParams.delete('due_date_start');
        else updatedParams.set('due_date_start', newFilters.due_date_start);
      }
      if (newFilters.due_date_end !== undefined) {
        if (!newFilters.due_date_end) updatedParams.delete('due_date_end');
        else updatedParams.set('due_date_end', newFilters.due_date_end);
      }
      // Reset pagination on filter change
      updatedParams.delete('page');

      setSearchParams(updatedParams);
    },
    [searchParams, setSearchParams]
  );

  const updateFiltersQuery = useMemo(() => debounce(updateFiltersQueryRaw, 300), [updateFiltersQueryRaw]);

  const updateSortingQueryRaw = useCallback(
    (newSorting: Partial<Sorting>) => {
      const updatedParams = new URLSearchParams(searchParams.toString());
      if (newSorting.sort_by) {
        updatedParams.set('sort_by', newSorting.sort_by);
      }
      if (newSorting.sort_order) {
        updatedParams.set('sort_order', newSorting.sort_order);
      }
      // Reset pagination on sort change
      updatedParams.delete('page');
      setSearchParams(updatedParams);
    },
    [searchParams, setSearchParams]
  );

  const updateSortingQuery = useMemo(() => debounce(updateSortingQueryRaw, 300), [updateSortingQueryRaw]);

  // Update pagination page
  const setPage = (pageNum: number) => {
    const updatedParams = new URLSearchParams(searchParams.toString());
    if (pageNum <= 1) updatedParams.delete('page');
    else updatedParams.set('page', pageNum.toString());
    setSearchParams(updatedParams);
  };
  // Update pagination page size
  const setPageSize = (size: number) => {
    const updatedParams = new URLSearchParams(searchParams.toString());
    updatedParams.set('page_size', size.toString());
    updatedParams.delete('page');
    setSearchParams(updatedParams);
  };

  // When task_list_id changes, reset multi-select and selection
  useEffect(() => {
    setMultiSelectMode(false);
    set_selected_tasks([]);
    setBulkActionUndoToastVisible(false);
    setIsFilterPanelOpen(false);
  }, [task_list_id]);

  // Handle global undo toast auto-hide after 10 sec
  useEffect(() => {
    if (bulkActionUndoToastVisible) {
      const timer = setTimeout(() => {
        setBulkActionUndoToastVisible(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [bulkActionUndoToastVisible]);

  // UX: keyboard shortcuts to toggle multi-select (Ctrl+M), select all (Ctrl+A) disabled for MVP simplicity

  // UI components render using single enclosing <>
  // Accessibility and a11y for buttons and inputs is basic but implemented

  return (
    <>
      {/* Header toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">{taskListMetadata ? taskListMetadata.list_name : 'Loading...'}</h1>
        <div className="flex flex-wrap items-center gap-2">

          {/* Filters toggle */}
          <button
            type="button"
            onClick={toggleFiltersPanel}
            className="px-3 py-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-800"
            aria-expanded={isFilterPanelOpen}
            aria-controls="filter-panel"
          >
            {isFilterPanelOpen ? 'Hide Filters' : 'Show Filters'}
          </button>

          {/* Sort dropdown */}
          <select
            aria-label="Sort tasks by"
            value={sort_by}
            onChange={(e) => updateSortingQuery({ sort_by: e.target.value as Sorting['sort_by'] })}
            className="border rounded px-2 py-1 dark:bg-gray-700 dark:text-white"
          >
            <option value="manual">Manual</option>
            <option value="deadline">Deadline</option>
            <option value="priority">Priority</option>
            <option value="created_at">Creation Date</option>
          </select>

          {/* Sort order toggle */}
          <button
            type="button"
            onClick={() => updateSortingQuery({ sort_order: sort_order === 'asc' ? 'desc' : 'asc' })}
            aria-label={`Switch sort order from ${sort_order === 'asc' ? 'ascending' : 'descending'}`}
            className="border rounded px-2 py-1 dark:bg-gray-700 dark:text-white"
          >
            {sort_order === 'asc' ? 'Asc' : 'Desc'}
          </button>

          {/* Multi-select toggle */}
          <button
            type="button"
            onClick={toggleMultiSelectMode}
            className={`px-3 py-1 border rounded ${multiSelectMode ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}
            aria-pressed={multiSelectMode}
          >
            {multiSelectMode ? 'Exit Multi-Select' : 'Multi-Select'}
          </button>

          {/* Add Task button */}
          <button
            type="button"
            onClick={() => setIsAddTaskModalOpen(true)}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            + Add Task
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {isFilterPanelOpen && (
        <section
          id="filter-panel"
          className="mb-6 p-4 border rounded bg-white dark:bg-gray-800 dark:border-gray-700"
          aria-label="Task filters"
        >
          {/* Status */}
          <div className="mb-4">
            <div className="font-semibold mb-1">Status</div>
            <div className="flex gap-4 flex-wrap">
              {statusOptions.map((status) => (
                <label key={status} className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.status.includes(status)}
                    onChange={(e) => {
                      let newStatus = [...filters.status];
                      if (e.target.checked) {
                        if (!newStatus.includes(status)) newStatus.push(status);
                      } else {
                        newStatus = newStatus.filter((s) => s !== status);
                      }
                      updateFiltersQuery({ status: newStatus });
                    }}
                  />
                  <span>{status}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="mb-4">
            <div className="font-semibold mb-1">Tags</div>
            <div className="flex gap-2 flex-wrap max-h-32 overflow-auto border rounded p-2 bg-gray-100 dark:bg-gray-700">
              {tagsForFilter.length === 0 && <em className="text-gray-500">No tags available</em>}
              {tagsForFilter.map((tag) => {
                const selected = filters.tags.includes(tag.tag_id);
                return (
                  <label
                    key={tag.tag_id}
                    className={`cursor-pointer px-2 py-0.5 rounded select-none ${
                      selected ? 'bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-600 dark:text-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={selected}
                      onChange={(e) => {
                        let newTags = [...filters.tags];
                        if (e.target.checked) {
                          if (!newTags.includes(tag.tag_id)) newTags.push(tag.tag_id);
                        } else {
                          newTags = newTags.filter((tid) => tid !== tag.tag_id);
                        }
                        updateFiltersQuery({ tags: newTags });
                      }}
                    />
                    {tag.tag_name}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Assigned Users */}
          <div className="mb-4">
            <div className="font-semibold mb-1">Assigned Users</div>
            <div className="flex gap-2 flex-wrap max-h-32 overflow-auto border rounded p-2 bg-gray-100 dark:bg-gray-700">
              {assignedUsersForFilter.length === 0 && <em className="text-gray-500">No assigned users</em>}
              {assignedUsersForFilter.map((user) => {
                const selected = filters.assigned_user_ids.includes(user.user_id);
                const displayName = user.full_name || user.email;
                return (
                  <label
                    key={user.user_id}
                    className={`cursor-pointer px-2 py-0.5 rounded select-none ${
                      selected ? 'bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-600 dark:text-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={selected}
                      onChange={(e) => {
                        let newUsers = [...filters.assigned_user_ids];
                        if (e.target.checked) {
                          if (!newUsers.includes(user.user_id)) newUsers.push(user.user_id);
                        } else {
                          newUsers = newUsers.filter((uid) => uid !== user.user_id);
                        }
                        updateFiltersQuery({ assigned_user_ids: newUsers });
                      }}
                    />
                    {displayName}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Due Date Range */}
          <div className="mb-4 flex flex-wrap gap-4 items-center">
            <label htmlFor="due-date-start" className="font-semibold mr-2">
              Due Date Start:
            </label>
            <input
              id="due-date-start"
              type="date"
              value={filters.due_date_start || ''}
              onChange={(e) => {
                updateFiltersQuery({ due_date_start: e.target.value || null });
              }}
              className="border rounded px-2 py-1 dark:bg-gray-700 dark:text-white"
            />
            <label htmlFor="due-date-end" className="font-semibold mr-2">
              Due Date End:
            </label>
            <input
              id="due-date-end"
              type="date"
              value={filters.due_date_end || ''}
              onChange={(e) => {
                updateFiltersQuery({ due_date_end: e.target.value || null });
              }}
              className="border rounded px-2 py-1 dark:bg-gray-700 dark:text-white"
            />
            {/* Clear dates button */}
            {(filters.due_date_start || filters.due_date_end) && (
              <button
                type="button"
                className="text-sm underline text-blue-600 dark:text-blue-500"
                onClick={() => {
                  updateFiltersQuery({ due_date_start: null, due_date_end: null });
                }}
              >
                Clear Dates
              </button>
            )}
          </div>
        </section>
      )}

      {/* Bulk action toolbar */}
      {multiSelectMode && selected_tasks.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 bg-gray-100 dark:bg-gray-700 p-3 rounded">
          <div className="flex-1 text-sm font-semibold">
            Selected {selected_tasks.length} {selected_tasks.length === 1 ? 'task' : 'tasks'}
          </div>
          <button
            onClick={performBulkComplete}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            type="button"
          >
            Mark Complete
          </button>
          <button
            onClick={performBulkMarkIncomplete}
            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            type="button"
          >
            Mark Incomplete
          </button>
          <button
            onClick={performBulkDelete}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            type="button"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => {
              set_selected_tasks([]);
              setMultiSelectMode(false);
            }}
            className="px-3 py-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Undo toast for bulk delete */}
      {bulkActionUndoToastVisible && undoEntry && (
        <div className="fixed bottom-6 right-6 bg-gray-800 text-white px-5 py-3 rounded shadow-lg z-50 flex items-center gap-4">
          <span>Action performed. </span>
          <button
            onClick={onUndo}
            className="underline hover:text-gray-300 focus:outline-none"
          >
            Undo
          </button>
          <button
            onClick={() => setBulkActionUndoToastVisible(false)}
            aria-label="Close undo notification"
            className="ml-4 font-bold p-1 rounded hover:bg-gray-700 focus:outline-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Task list container */}
      <div className="space-y-2">
        {isLoadingTaskListMetadata && (
          <div className="p-4 text-center text-gray-600 dark:text-gray-400">Loading task list info...</div>
        )}
        {isErrorTaskListMetadata && (
          <div className="p-4 text-center text-red-600 dark:text-red-400">
            Failed to load task list info: {errorTaskListMetadata?.message}
          </div>
        )}
        {!isLoadingTaskListMetadata && taskListMetadata && tasksList.length === 0 && (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No tasks found in this list.
          </div>
        )}

        {!isLoadingTasks && !isErrorTasks && (
          <>
            {flatTasks.map((task) => (
              <div
                key={task.task_id}
                draggable={!multiSelectMode}
                onDragStart={(e) => !multiSelectMode && handleDragStart(e, task.task_id)}
                onDragOver={handleDragOver}
                onDrop={(e) => !multiSelectMode && handleDrop(e, task.task_id)}
                className={`border rounded p-3 flex items-center gap-4 cursor-pointer select-none ${
                  task.is_completed || task.status === 'Completed'
                    ? 'bg-green-100 dark:bg-green-900 line-through text-gray-500 dark:text-gray-400'
                    : 'bg-white dark:bg-gray-800'
                }`}
                style={{ paddingLeft: 16 + task.indentLevel * 24 }}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/tasks/${task.task_id}`);
                  }
                }}
                onClick={() => navigate(`/tasks/${task.task_id}`)}
              >
                {/* Multi-select checkbox */}
                {multiSelectMode && (
                  <input
                    type="checkbox"
                    checked={isTaskSelected(task.task_id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleTaskSelected(task.task_id)}
                    aria-label={`Select task "${task.title}"`}
                  />
                )}

                {/* Completion checkbox */}
                {!multiSelectMode && (
                  <input
                    type="checkbox"
                    checked={task.is_completed}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTaskCompletion(task);
                    }}
                    aria-label={`Mark task "${task.title}" as ${
                      task.is_completed ? 'incomplete' : 'complete'
                    }`}
                    className="w-5 h-5"
                  />
                )}

                {/* Task title and info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{task.title}</div>

                  <div className="flex flex-wrap text-xs mt-1 gap-2 text-gray-600 dark:text-gray-300">
                    {task.due_datetime && (
                      <div
                        className={`flex items-center gap-1 ${
                          new Date(task.due_datetime) < new Date() && !task.is_completed
                            ? 'text-red-600 dark:text-red-400'
                            : ''
                        }`}
                      >
                        <span className="leading-none">📅</span>
                        <time dateTime={task.due_datetime}>
                          {formatDateTime(task.due_datetime, user_setting.timezone_offset)}
                        </time>
                      </div>
                    )}

                    <div
                      className={`px-2 py-0.5 rounded text-white font-semibold ${
                        priorityColorMap[task.priority] || 'bg-gray-500'
                      } select-none`}
                    >
                      {task.priority}
                    </div>

                    {/* Tags */}
                    {task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 max-w-full overflow-x-auto">
                        {task.tags.map((tag) => (
                          <span
                            key={tag.tag_id}
                            className="bg-gray-300 dark:bg-gray-600 text-xs rounded px-1.5 py-0.5 whitespace-nowrap select-none"
                          >
                            #{tag.tag_name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Assigned users */}
                    {task.assigned_users.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap max-w-full overflow-x-auto">
                        {task.assigned_users.map((u) => (
                          <span
                            key={u.user_id}
                            title={u.full_name || u.email}
                            className="bg-blue-500 text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap select-none"
                          >
                            {u.full_name ? u.full_name.split(' ').map(n => n[0]).join('') : u.email[0].toUpperCase()}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Recurrence indicator */}
                    {task.recurring_pattern && (
                      <span className="text-xs italic text-gray-500 dark:text-gray-400">🔁 Recurring</span>
                    )}

                    {/* Status badge */}
                    <div className="px-2 py-0.5 rounded text-xs font-semibold text-gray-700 bg-gray-200 dark:bg-gray-600 dark:text-gray-200 select-none">
                      {task.status}
                    </div>
                  </div>
                </div>

                {/* Drag handle show only if not multi-select */}
                {!multiSelectMode && (
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Drag to reorder task"
                    className="cursor-move select-none text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        // No native drag start, so no default action.
                      }
                    }}
                  >
                    ≡
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* Loading and error states for tasks */}
        {isLoadingTasks && (
          <div className="p-4 text-center text-gray-600 dark:text-gray-400">Loading tasks...</div>
        )}
        {isErrorTasks && (
          <div className="p-4 text-center text-red-600 dark:text-red-400">Failed to load tasks: {errorTasks?.message}</div>
        )}

        {/* Pagination controls */}
        {!isLoadingTasks && !isErrorTasks && tasksData && tasksData.total_count > page_size && (
          <nav
            aria-label="Pagination"
            className="mt-6 flex flex-wrap items-center gap-3 justify-center text-sm text-gray-600 dark:text-gray-400"
          >
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700"
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              type="button"
              disabled={page * page_size >= tasksData.total_count}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700"
            >
              Next
            </button>
            <select
              aria-label="Tasks per page"
              value={page_size}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border rounded px-2 py-1 dark:bg-gray-700 dark:text-white"
            >
              {[10, 25, 50, 100].map((sz) => (
                <option key={sz} value={sz}>
                  {sz} / page
                </option>
              ))}
            </select>
            <div className="text-xs mt-1 md:mt-0">
              Total tasks: {tasksData.total_count}
            </div>
          </nav>
        )}
      </div>

      {/* Add Task Modal */}
      {isAddTaskModalOpen && (
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-task-title"
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsAddTaskModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="add-task-title"
              className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100"
            >
              Add New Task
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTaskTitle.trim()) {
                  alert('Title is required');
                  return;
                }
                mutationCreateTask.mutate();
              }}
            >
              <div className="mb-4">
                <label htmlFor="new-task-title" className="block font-semibold mb-1 text-gray-800 dark:text-gray-200">
                  Title *
                </label>
                <input
                  id="new-task-title"
                  type="text"
                  className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="mb-4">
                <label htmlFor="new-task-description" className="block font-semibold mb-1 text-gray-800 dark:text-gray-200">
                  Description
                </label>
                <textarea
                  id="new-task-description"
                  rows={3}
                  className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
                  value={newTaskDescription || ''}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label htmlFor="new-task-priority" className="block font-semibold mb-1 text-gray-800 dark:text-gray-200">
                  Priority
                </label>
                <select
                  id="new-task-priority"
                  className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="mb-4 flex flex-wrap gap-4 items-center">
                <div>
                  <label htmlFor="new-task-due-date" className="block font-semibold mb-1 text-gray-800 dark:text-gray-200">
                    Due Date
                  </label>
                  <input
                    id="new-task-due-date"
                    type="date"
                    className="border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="new-task-due-time" className="block font-semibold mb-1 text-gray-800 dark:text-gray-200">
                    Due Time
                  </label>
                  <input
                    id="new-task-due-time"
                    type="time"
                    className="border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
                    value={newTaskDueTime}
                    onChange={(e) => setNewTaskDueTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(false)}
                  className="px-4 py-2 rounded border hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutationCreateTask.isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-70"
                >
                  {mutationCreateTask.isLoading ? 'Adding...' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}
    </>
  );
};

export default UV_ToDoListView;