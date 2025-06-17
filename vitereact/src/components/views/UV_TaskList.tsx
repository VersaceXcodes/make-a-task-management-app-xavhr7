import React, { useState, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAppStore } from "@/store/main";

interface Task {
  task_id: string;
  title: string;
  due_date: string;
  priority: string;
  status: string;
  assignees: string[];
  labels: string[];
}

interface FilterParams {
  status?: string;
  assignee?: string;
  priority?: string;
}

const UV_TaskList: React.FC = () => {
  // Get the auth token from global Zustand store.
  const token = useAppStore((state) => state.auth_state.token);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filter parameters from URL query.
  const initialFilter: FilterParams = {
    status: searchParams.get("status") || "",
    assignee: searchParams.get("assignee") || "",
    priority: searchParams.get("priority") || "",
  };
  const [filterParams, setFilterParams] = useState<FilterParams>(initialFilter);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const queryClient = useQueryClient();

  // Function to fetch tasks from the backend using filter parameters.
  const fetchTasks = async (filters: FilterParams): Promise<Task[]> => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
    const params: any = {};
    if (filters.status) params.status = filters.status;
    if (filters.assignee) params.assignee = filters.assignee;
    if (filters.priority) params.priority = filters.priority;
    const response = await axios.get(`${baseUrl}/api/tasks`, {
      params,
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.tasks;
  };

  // Use Query to fetch tasks when filterParams change.
  const { data: tasks, isLoading, isError, error } = useQuery<Task[], Error>(
    ["tasks", filterParams],
    () => fetchTasks(filterParams),
    { enabled: !!token }
  );

  // Create a mutation to update a task's status (used for batch marking tasks complete).
  const updateTaskStatusMutation = useMutation(
    ({ task_id, status }: { task_id: string; status: string }) => {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
      return axios.put(
        `${baseUrl}/api/tasks/${task_id}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["tasks"]);
      },
    }
  );

  // Compute sorted tasks based on selected sortField and sortDirection.
  const sortedTasks = useMemo(() => {
    if (!tasks) return [];
    let sorted = [...tasks];
    if (sortField) {
      sorted.sort((a, b) => {
        let aField = (a as any)[sortField];
        let bField = (b as any)[sortField];
        // Special handling for due_date: convert to time numeric value.
        if (sortField === "due_date") {
          const aDate = aField ? new Date(aField).getTime() : 0;
          const bDate = bField ? new Date(bField).getTime() : 0;
          return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
        }
        // For 'assignees', compare the first element.
        if (sortField === "assignees") {
          aField = aField && aField.length > 0 ? aField[0] : "";
          bField = bField && bField.length > 0 ? bField[0] : "";
        }
        if (typeof aField === "string" && typeof bField === "string") {
          return sortDirection === "asc"
            ? aField.localeCompare(bField)
            : bField.localeCompare(aField);
        }
        return 0;
      });
    }
    return sorted;
  }, [tasks, sortField, sortDirection]);

  // Handler for sorting when a column header is clicked.
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Handler to update filter parameters and synchronize with URL query.
  const handleFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    const newFilters = { ...filterParams, [name]: value };
    setFilterParams(newFilters);
    const params: any = {};
    if (newFilters.status) params.status = newFilters.status;
    if (newFilters.assignee) params.assignee = newFilters.assignee;
    if (newFilters.priority) params.priority = newFilters.priority;
    setSearchParams(params);
  };

  // Handler for task checkbox selection.
  const handleCheckboxChange = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedTaskIds([...selectedTaskIds, taskId]);
    } else {
      setSelectedTaskIds(selectedTaskIds.filter((id) => id !== taskId));
    }
  };

  // Handler for batch action "Mark Selected as Complete".
  const handleBatchComplete = () => {
    selectedTaskIds.forEach((taskId) => {
      updateTaskStatusMutation.mutate({ task_id: taskId, status: "completed" });
    });
    setSelectedTaskIds([]);
  };

  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">Task List</h1>
        <div className="flex space-x-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status:
            </label>
            <select
              name="status"
              value={filterParams.status}
              onChange={handleFilterChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Assignee:
            </label>
            <input
              name="assignee"
              value={filterParams.assignee}
              onChange={handleFilterChange}
              type="text"
              placeholder="Assignee ID"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Priority:
            </label>
            <select
              name="priority"
              value={filterParams.priority}
              onChange={handleFilterChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            >
              <option value="">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        {selectedTaskIds.length > 0 && (
          <div className="mb-4">
            <button
              onClick={handleBatchComplete}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Mark Selected as Complete
            </button>
          </div>
        )}
      </div>
      {isLoading ? (
        <div className="text-center">Loading tasks...</div>
      ) : isError ? (
        <div className="text-center text-red-600">
          Error loading tasks: {(error as Error).message}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={
                      selectedTaskIds.length === (tasks ? tasks.length : 0)
                    }
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (checked && tasks) {
                        setSelectedTaskIds(tasks.map((task) => task.task_id));
                      } else {
                        setSelectedTaskIds([]);
                      }
                    }}
                  />
                </th>
                <th
                  className="px-4 py-2 cursor-pointer"
                  onClick={() => handleSort("title")}
                >
                  Title{" "}
                  {sortField === "title" && (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="px-4 py-2 cursor-pointer"
                  onClick={() => handleSort("due_date")}
                >
                  Due Date{" "}
                  {sortField === "due_date" &&
                    (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="px-4 py-2 cursor-pointer"
                  onClick={() => handleSort("priority")}
                >
                  Priority{" "}
                  {sortField === "priority" &&
                    (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="px-4 py-2 cursor-pointer"
                  onClick={() => handleSort("status")}
                >
                  Status{" "}
                  {sortField === "status" &&
                    (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="px-4 py-2 cursor-pointer"
                  onClick={() => handleSort("assignees")}
                >
                  Assignee{" "}
                  {sortField === "assignees" &&
                    (sortDirection === "asc" ? "▲" : "▼")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTasks.map((task) => (
                <tr
                  key={task.task_id}
                  className="hover:bg-gray-100 cursor-pointer"
                  onClick={() => navigate(`/tasks/${task.task_id}`)}
                >
                  <td
                    className="px-4 py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.includes(task.task_id)}
                      onChange={(e) =>
                        handleCheckboxChange(task.task_id, e.target.checked)
                      }
                    />
                  </td>
                  <td className="px-4 py-2">{task.title}</td>
                  <td className="px-4 py-2">
                    {task.due_date
                      ? new Date(task.due_date).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="px-4 py-2 capitalize">{task.priority}</td>
                  <td className="px-4 py-2 capitalize">
                    {task.status.replace("_", " ")}
                  </td>
                  <td className="px-4 py-2">{task.assignees.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default UV_TaskList;