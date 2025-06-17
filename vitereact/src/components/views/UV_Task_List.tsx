import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Link, useSearchParams } from "react-router-dom";
import { useAppStore } from "@/store/main";

interface Task {
  uid: string;
  title: string;
  due_date: string;
  priority: string;
  status: string;
}

interface Filters {
  status: string;
  priority: string;
  due_date: string;
  project_uid: string;
  tags: string;
}

const UV_Task_List: React.FC = () => {
  // Get auth token and user info from global store
  const auth_token = useAppStore((state) => state.auth_token);

  // Setup query parameters for filters
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilters: Filters = {
    status: searchParams.get("status") || "",
    priority: searchParams.get("priority") || "",
    due_date: searchParams.get("due_date") || "",
    project_uid: searchParams.get("project_uid") || "",
    tags: searchParams.get("tags") || ""
  };
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [sortOrder, setSortOrder] = useState<string>("due_date");

  // For inline editing
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState<string>("");

  const queryClient = useQueryClient();
  const baseURL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}`;

  // Function to fetch tasks using filters
  const fetchTasks = async (): Promise<Task[]> => {
    const response = await axios.get(`${baseURL}/api/tasks`, {
      headers: { Authorization: `Bearer ${auth_token}` },
      params: {
        ...filters
      }
    });
    return response.data;
  };

  // Use react-query to fetch tasks
  const { data: tasks, isLoading, isError, error } = useQuery<Task[], Error>({
    queryKey: ['tasks', filters],
    queryFn: fetchTasks,
    enabled: !!auth_token
  });

  // Mutation for deleting a task
  const deleteTaskMutation = useMutation(
    (taskId: string) =>
      axios.delete(`${baseURL}/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${auth_token}` }
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['tasks', filters]);
      }
    }
  );

  // Mutation for marking a task as completed
  const completeTaskMutation = useMutation(
    (taskId: string) =>
      axios.put(
        `${baseURL}/api/tasks/${taskId}`,
        { status: "completed" },
        { headers: { Authorization: `Bearer ${auth_token}` } }
      ),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['tasks', filters]);
      }
    }
  );

  // Mutation for inline editing a task (update title)
  const editTaskMutation = useMutation(
    (data: { taskId: string; title: string }) =>
      axios.put(
        `${baseURL}/api/tasks/${data.taskId}`,
        { title: data.title },
        { headers: { Authorization: `Bearer ${auth_token}` } }
      ),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['tasks', filters]);
        setEditingTaskId(null);
        setEditedTitle("");
      }
    }
  );

  // Handle filter input changes (updates local filters state and URL search params)
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    // Update URL search params
    let newSearchParams = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, val]) => {
      if (val) {
        newSearchParams.set(key, val);
      }
    });
    setSearchParams(newSearchParams);
  };

  // Handle sorting change (if needed - simple implementation)
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOrder(e.target.value);
  };

  const sortedTasks = useMemo(() => {
    if (!tasks) return [];
    const tasksCopy = [...tasks];
    switch (sortOrder) {
      case 'priority': {
        const priorityOrder: Record<string, number> = { low: 1, medium: 2, high: 3 };
        return tasksCopy.sort((a, b) => (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0));
      }
      case 'status':
        return tasksCopy.sort((a, b) => a.status.localeCompare(b.status));
      case 'due_date':
      default:
        return tasksCopy.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    }
  }, [tasks, sortOrder]);

  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">Task List</h1>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input
            type="text"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            placeholder="Status (to_do, in_progress, completed)"
            className="border rounded p-1"
          />
          <input
            type="text"
            name="priority"
            value={filters.priority}
            onChange={handleFilterChange}
            placeholder="Priority (low, medium, high)"
            className="border rounded p-1"
          />
          <input
            type="date"
            name="due_date"
            value={filters.due_date}
            onChange={handleFilterChange}
            placeholder="Due Date"
            className="border rounded p-1"
          />
          <input
            type="text"
            name="project_uid"
            value={filters.project_uid}
            onChange={handleFilterChange}
            placeholder="Project UID"
            className="border rounded p-1"
          />
          <input
            type="text"
            name="tags"
            value={filters.tags}
            onChange={handleFilterChange}
            placeholder="Tags"
            className="border rounded p-1"
          />
        </div>
        <div className="mt-2">
          <label className="mr-2 font-semibold">Sort by:</label>
          <select
            value={sortOrder}
            onChange={handleSortChange}
            className="border rounded p-1"
          >
            <option value="due_date">Due Date</option>
            <option value="priority">Priority</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      {isLoading && <div>Loading tasks...</div>}
      {isError && <div>Error: {(error as Error).message}</div>}
      {!isLoading && tasks && (
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 border">Title</th>
              <th className="p-2 border">Due Date</th>
              <th className="p-2 border">Priority</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => (
              <tr key={task.uid} className="hover:bg-gray-100">
                <td className="p-2 border">
                  {editingTaskId === task.uid ? (
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="border rounded p-1 w-full"
                    />
                  ) : (
                    <Link to={`/tasks/${task.uid}`} className="text-blue-500 hover:underline">
                      {task.title}
                    </Link>
                  )}
                </td>
                <td className="p-2 border">{task.due_date}</td>
                <td className="p-2 border">{task.priority}</td>
                <td className="p-2 border">{task.status}</td>
                <td className="p-2 border">
                  {editingTaskId === task.uid ? (
                    <>
                      <button
                        onClick={() => {
                          // Trigger inline edit mutation
                          editTaskMutation.mutate({ taskId: task.uid, title: editedTitle });
                        }}
                        className="bg-green-500 text-white px-2 py-1 rounded mr-2"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingTaskId(null);
                          setEditedTitle("");
                        }}
                        className="bg-gray-500 text-white px-2 py-1 rounded"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingTaskId(task.uid);
                          setEditedTitle(task.title);
                        }}
                        className="bg-blue-500 text-white px-2 py-1 rounded mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this task?")) {
                            deleteTaskMutation.mutate(task.uid);
                          }
                        }}
                        className="bg-red-500 text-white px-2 py-1 rounded mr-2"
                      >
                        Delete
                      </button>
                      {task.status !== "completed" && (
                        <button
                          onClick={() => {
                            completeTaskMutation.mutate(task.uid);
                          }}
                          className="bg-green-500 text-white px-2 py-1 rounded"
                        >
                          Mark Complete
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
};

export default UV_Task_List;