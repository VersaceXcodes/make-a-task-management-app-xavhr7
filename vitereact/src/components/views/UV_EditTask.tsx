import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/main";

// Interfaces for data structures
interface Subtask {
  title: string;
  is_completed: boolean;
}

interface TaskDetails {
  title: string;
  description: string;
  due_date: string;
  priority: string;
  status: string;
  assignees: string[];
  labels: string[];
  subtasks: Subtask[];
}

interface ValidationErrors {
  title?: string;
  description?: string;
  due_date?: string;
  priority?: string;
  status?: string;
  // can add a general error property if needed
  general?: string;
}

// Default values for task details
const defaultTaskDetails: TaskDetails = {
  title: "",
  description: "",
  due_date: "",
  priority: "",
  status: "",
  assignees: [],
  labels: [],
  subtasks: [],
};

const UV_EditTask: React.FC = () => {
  const { task_id } = useParams<{ task_id: string }>();
  const token = useAppStore((state) => state.auth_state.token);
  const queryClient = useQueryClient();

  // Local state for task details, validation errors, and submission status
  const [taskDetails, setTaskDetails] = useState<TaskDetails>(defaultTaskDetails);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reference for debounce timer
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Validation function to check required fields
  const validateFields = (fields: TaskDetails): ValidationErrors => {
    const errors: ValidationErrors = {};
    if (!fields.title || fields.title.trim() === "") {
      errors.title = "Title is required";
    }
    // Additional validations can be added as required.
    return errors;
  };

  // Fetch existing task details using useQuery
  const { isLoading, error } = useQuery(
    ["task", task_id],
    async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/tasks/${task_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    {
      onSuccess: (data) => {
        // Populate local state with fetched task details
        if (data && data.task) {
          setTaskDetails(data.task);
        }
      },
    }
  );

  // Mutation for updating (saving) task details
  const updateTaskMutation = useMutation(
    async (updatedTask: TaskDetails) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/tasks/${task_id}`,
        updatedTask,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    {
      onSuccess: (data) => {
        setIsSubmitting(false);
        // Update local state with the returned task data
        if (data && data.task) {
          setTaskDetails(data.task);
        }
        queryClient.invalidateQueries(["task", task_id]);
      },
      onError: (err) => {
        setIsSubmitting(false);
        setValidationErrors({ general: "Failed to update task." });
      },
    }
  );

  // Auto-save effect: debounced update call when taskDetails state changes
  useEffect(() => {
    if (isLoading) return;
    const errors = validateFields(taskDetails);
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      updateTaskMutation.mutate(taskDetails);
    }, 1000);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [taskDetails]);

  // Handlers for input changes
  const handleInputChange = (field: keyof TaskDetails, value: any) => {
    setTaskDetails((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubtaskChange = (index: number, field: keyof Subtask, value: any) => {
    setTaskDetails((prev) => {
      const newSubtasks = [...prev.subtasks];
      newSubtasks[index] = { ...newSubtasks[index], [field]: value };
      return { ...prev, subtasks: newSubtasks };
    });
  };

  const handleAddSubtask = () => {
    setTaskDetails((prev) => ({
      ...prev,
      subtasks: [...prev.subtasks, { title: "", is_completed: false }],
    }));
  };

  // Explicit form submit handler for saving changes
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateFields(taskDetails);
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setIsSubmitting(true);
    updateTaskMutation.mutate(taskDetails);
  };

  if (!task_id) {
    return <div className="p-4 text-red-500">Error: Task ID is missing.</div>;
  }

  if (isLoading) {
    return <div className="p-4">Loading task details...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error loading task details.</div>;
  }

  return (
    <>
      <div className="max-w-4xl mx-auto p-4 bg-white shadow rounded">
        <h1 className="text-2xl font-bold mb-4">Edit Task</h1>
        {validationErrors.general && (
          <p className="text-red-500 mb-4">{validationErrors.general}</p>
        )}
        <form onSubmit={handleSubmit}>
          {/* Title Field */}
          <div className="mb-4">
            <label className="block mb-1 font-semibold">Title</label>
            <input
              type="text"
              value={taskDetails.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
            {validationErrors.title && (
              <p className="text-red-500 text-sm">{validationErrors.title}</p>
            )}
          </div>
          {/* Description Field */}
          <div className="mb-4">
            <label className="block mb-1 font-semibold">Description</label>
            <textarea
              value={taskDetails.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
            {validationErrors.description && (
              <p className="text-red-500 text-sm">{validationErrors.description}</p>
            )}
          </div>
          {/* Due Date Field */}
          <div className="mb-4">
            <label className="block mb-1 font-semibold">Due Date</label>
            <input
              type="datetime-local"
              value={taskDetails.due_date}
              onChange={(e) => handleInputChange("due_date", e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
            {validationErrors.due_date && (
              <p className="text-red-500 text-sm">{validationErrors.due_date}</p>
            )}
          </div>
          {/* Priority Field */}
          <div className="mb-4">
            <label className="block mb-1 font-semibold">Priority</label>
            <select
              value={taskDetails.priority}
              onChange={(e) => handleInputChange("priority", e.target.value)}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="" disabled>
                Select priority
              </option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            {validationErrors.priority && (
              <p className="text-red-500 text-sm">{validationErrors.priority}</p>
            )}
          </div>
          {/* Status Field */}
          <div className="mb-4">
            <label className="block mb-1 font-semibold">Status</label>
            <select
              value={taskDetails.status}
              onChange={(e) => handleInputChange("status", e.target.value)}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="" disabled>
                Select status
              </option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            {validationErrors.status && (
              <p className="text-red-500 text-sm">{validationErrors.status}</p>
            )}
          </div>
          {/* Assignees Field */}
          <div className="mb-4">
            <label className="block mb-1 font-semibold">
              Assignees (comma separated IDs)
            </label>
            <input
              type="text"
              value={taskDetails.assignees.join(",")}
              onChange={(e) =>
                handleInputChange(
                  "assignees",
                  e.target.value.split(",").map((s) => s.trim())
                )
              }
              className="w-full border px-3 py-2 rounded"
            />
          </div>
          {/* Labels Field */}
          <div className="mb-4">
            <label className="block mb-1 font-semibold">
              Labels (comma separated IDs)
            </label>
            <input
              type="text"
              value={taskDetails.labels.join(",")}
              onChange={(e) =>
                handleInputChange(
                  "labels",
                  e.target.value.split(",").map((s) => s.trim())
                )
              }
              className="w-full border px-3 py-2 rounded"
            />
          </div>
          {/* Subtasks Field */}
          <div className="mb-4">
            <label className="block mb-1 font-semibold">Subtasks</label>
            {taskDetails.subtasks.map((subtask, index) => (
              <div key={index} className="mb-2 flex items-center">
                <input
                  type="checkbox"
                  checked={subtask.is_completed}
                  onChange={(e) =>
                    handleSubtaskChange(index, "is_completed", e.target.checked)
                  }
                  className="mr-2"
                />
                <input
                  type="text"
                  value={subtask.title}
                  onChange={(e) =>
                    handleSubtaskChange(index, "title", e.target.value)
                  }
                  className="w-full border px-3 py-2 rounded"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddSubtask}
              className="text-blue-500 hover:underline mt-2"
            >
              Add Subtask
            </button>
          </div>
          {/* Form Submission Buttons */}
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              disabled={isSubmitting || updateTaskMutation.isLoading}
            >
              {isSubmitting || updateTaskMutation.isLoading ? "Saving..." : "Save Changes"}
            </button>
            <Link to={`/tasks/${task_id}`} className="text-blue-500 hover:underline">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </>
  );
};

export default UV_EditTask;