import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Link, useSearchParams } from "react-router-dom";
import { useAppStore } from "@/store/main";

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
  project_id: string;
}

interface ValidationErrors {
  title?: string;
  description?: string;
  due_date?: string;
  priority?: string;
  status?: string;
}

const defaultTaskDetails: TaskDetails = {
  title: "",
  description: "",
  due_date: "",
  priority: "medium",
  status: "pending",
  assignees: [],
  labels: [],
  subtasks: [],
  project_id: ""
};

const UV_CreateTask: React.FC = () => {
  const queryClient = useQueryClient();
  const { auth_state } = useAppStore((state) => ({ auth_state: state.auth_state }));
  const [searchParams] = useSearchParams();

  const [taskDetails, setTaskDetails] = useState<TaskDetails>(defaultTaskDetails);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [subtaskInput, setSubtaskInput] = useState<string>("");

  // Initialize project_id from URL query parameters if provided
  useEffect(() => {
    const projectIdFromUrl = searchParams.get("project_id");
    if (projectIdFromUrl) {
      setTaskDetails((prev) => ({ ...prev, project_id: projectIdFromUrl }));
    }
  }, [searchParams]);

  // Real-time validation of required fields (currently only title is required)
  const validateFields = (fieldName: string, value: string) => {
    let error = "";
    if (fieldName === "title" && value.trim() === "") {
      error = "Title is required";
    }
    setValidationErrors((prev) => ({ ...prev, [fieldName]: error }));
  };

  // Generic change handler for inputs
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setTaskDetails((prev) => ({ ...prev, [name]: value }));
    validateFields(name, value);
  };

  // Add a new subtask from the subtask input field
  const addSubtask = () => {
    if (subtaskInput.trim() !== "") {
      setTaskDetails((prev) => ({
        ...prev,
        subtasks: [...prev.subtasks, { title: subtaskInput, is_completed: false }]
      }));
      setSubtaskInput("");
    }
  };

  // Remove a subtask from the list based on its index
  const removeSubtask = (index: number) => {
    setTaskDetails((prev) => ({
      ...prev,
      subtasks: prev.subtasks.filter((_, idx) => idx !== index)
    }));
  };

  // Define the mutation for submitting the new task to the backend
  const mutation = useMutation({
    mutationFn: async (newTask: TaskDetails) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/tasks`,
        newTask,
        {
          headers: { Authorization: `Bearer ${auth_state.token}` }
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error: any) => {
      console.error("Error creating task:", error);
    }
  });

  // Form submission handler
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Validate required field "title"
    if (taskDetails.title.trim() === "") {
      setValidationErrors((prev) => ({ ...prev, title: "Title is required" }));
      return;
    }
    setIsSubmitting(true);
    mutation.mutate(taskDetails, {
      onSettled: () => {
        setIsSubmitting(false);
      }
    });
  };

  // Reset the form fields to default values while preserving project_id from URL
  const resetForm = () => {
    const projectIdFromUrl = searchParams.get("project_id") || "";
    setTaskDetails({ ...defaultTaskDetails, project_id: projectIdFromUrl });
    setValidationErrors({});
  };

  return (
    <>
      <div className="max-w-3xl mx-auto p-4 bg-white shadow rounded">
        <h1 className="text-2xl font-bold mb-4">Create Task</h1>
        <form onSubmit={handleSubmit}>
          {/* Title Input */}
          <div className="mb-4">
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700"
            >
              Title<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={taskDetails.title}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              required
            />
            {validationErrors.title && (
              <p className="text-red-500 text-xs mt-1">
                {validationErrors.title}
              </p>
            )}
          </div>
          {/* Description Textarea */}
          <div className="mb-4">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={taskDetails.description}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              rows={4}
            ></textarea>
            {validationErrors.description && (
              <p className="text-red-500 text-xs mt-1">
                {validationErrors.description}
              </p>
            )}
          </div>
          {/* Due Date & Time Input */}
          <div className="mb-4">
            <label
              htmlFor="due_date"
              className="block text-sm font-medium text-gray-700"
            >
              Due Date & Time
            </label>
            <input
              type="datetime-local"
              id="due_date"
              name="due_date"
              value={taskDetails.due_date}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
            {validationErrors.due_date && (
              <p className="text-red-500 text-xs mt-1">
                {validationErrors.due_date}
              </p>
            )}
          </div>
          {/* Priority Dropdown */}
          <div className="mb-4">
            <label
              htmlFor="priority"
              className="block text-sm font-medium text-gray-700"
            >
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              value={taskDetails.priority}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            {validationErrors.priority && (
              <p className="text-red-500 text-xs mt-1">
                {validationErrors.priority}
              </p>
            )}
          </div>
          {/* Status Dropdown */}
          <div className="mb-4">
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              value={taskDetails.status}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            {validationErrors.status && (
              <p className="text-red-500 text-xs mt-1">
                {validationErrors.status}
              </p>
            )}
          </div>
          {/* Assignees Input */}
          <div className="mb-4">
            <label
              htmlFor="assignees"
              className="block text-sm font-medium text-gray-700"
            >
              Assignees
            </label>
            <input
              type="text"
              id="assignees"
              name="assignees"
              value={taskDetails.assignees.join(",")}
              onChange={(e) => {
                const value = e.target.value;
                const arr = value
                  .split(",")
                  .map((item) => item.trim())
                  .filter((item) => item !== "");
                setTaskDetails((prev) => ({ ...prev, assignees: arr }));
              }}
              placeholder="Enter assignee IDs separated by commas"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
          </div>
          {/* Labels Input */}
          <div className="mb-4">
            <label
              htmlFor="labels"
              className="block text-sm font-medium text-gray-700"
            >
              Labels/Tags
            </label>
            <input
              type="text"
              id="labels"
              name="labels"
              value={taskDetails.labels.join(",")}
              onChange={(e) => {
                const value = e.target.value;
                const arr = value
                  .split(",")
                  .map((item) => item.trim())
                  .filter((item) => item !== "");
                setTaskDetails((prev) => ({ ...prev, labels: arr }));
              }}
              placeholder="Enter labels separated by commas"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
          </div>
          {/* Subtasks Section */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Subtasks
            </label>
            <div className="flex items-center">
              <input
                type="text"
                value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                placeholder="Enter subtask title"
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
              <button
                type="button"
                onClick={addSubtask}
                className="ml-2 p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add
              </button>
            </div>
            <ul className="mt-2">
              {taskDetails.subtasks.map((subtask, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between p-2 border border-gray-200 rounded mb-2"
                >
                  <span>{subtask.title}</span>
                  <button
                    type="button"
                    onClick={() => removeSubtask(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {/* Submit and Reset Buttons */}
          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              {isSubmitting ? "Submitting..." : "Create Task"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Reset
            </button>
          </div>
        </form>
        {mutation.isError && (
          <div className="mt-4 text-red-500">
            Error creating task. Please try again.
          </div>
        )}
        {mutation.isSuccess && (
          <div className="mt-4 text-green-500">
            Task created successfully!
            <Link
              to={`/tasks/${mutation.data.task.task_id}`}
              className="underline text-blue-500 ml-2"
            >
              View Task
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_CreateTask;