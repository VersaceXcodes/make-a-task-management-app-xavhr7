import React, { useState, ChangeEvent, FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAppStore } from "@/store/main";

interface Subtask {
  uid?: string;
  title: string;
  due_date: string;
}

interface FormData {
  title: string;
  description: string;
  due_date: string;
  priority: string;
  project_uid: string;
  tags: string;
  subtasks: Subtask[];
}

const defaultFormData: FormData = {
  title: "",
  description: "",
  due_date: "",
  priority: "low", // using low/medium/high values
  project_uid: "",
  tags: "",
  subtasks: []
};

const UV_Task_Edit: React.FC = () => {
  const { task_uid } = useParams<{ task_uid: string }>();
  const navigate = useNavigate();
  const auth_token = useAppStore((state) => state.auth_token);
  
  if (!task_uid) {
    return <div className="text-red-500">Error: Task UID is missing.</div>;
  }

  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  // Fetch task and subtasks data on page load using react-query
  const { data, isLoading, isError } = useQuery(
    ["task", task_uid],
    async () => {
      const config = { headers: { Authorization: `Bearer ${auth_token}` } };
      const [taskRes, subtasksRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/tasks/${task_uid}`, config),
        axios.get(`${API_BASE_URL}/api/tasks/${task_uid}/subtasks`, config)
      ]);
      return { task: taskRes.data, subtasks: subtasksRes.data };
    },
    {
      enabled: !!task_uid && !!auth_token,
      onSuccess: (data) => {
        setFormData({
          title: data.task.title || "",
          description: data.task.description || "",
          due_date: data.task.due_date || "",
          // If the original task priority is not in low/medium/high, we default to low.
          priority: data.task.priority && ["low", "medium", "high"].includes(data.task.priority)
                    ? data.task.priority 
                    : "low",
          project_uid: data.task.project_uid || "",
          tags: data.task.tags || "",
          subtasks: data.subtasks.map((st: any) => ({
            uid: st.uid,
            title: st.title,
            due_date: st.due_date || ""
          }))
        });
      }
    }
  );

  // Mutation for updating the task and then processing subtasks modifications
  const updateTaskMutation = useMutation(
    async (updatedData: FormData) => {
      const config = { headers: { Authorization: `Bearer ${auth_token}` } };
      // Update main task details
      await axios.put(
        `${API_BASE_URL}/api/tasks/${task_uid}`,
        {
          title: updatedData.title,
          description: updatedData.description,
          due_date: updatedData.due_date,
          priority: updatedData.priority,
          project_uid: updatedData.project_uid,
          tags: updatedData.tags
        },
        config
      );
      const subtaskPromises = updatedData.subtasks.map((subtask) => {
        if (subtask.uid) {
          // Update existing subtask
          return axios.put(
            `${API_BASE_URL}/api/subtasks/${subtask.uid}`,
            {
              title: subtask.title,
              due_date: subtask.due_date
            },
            config
          );
        } else if (subtask.title.trim() !== "") {
          // Create new subtask if title is non-empty
          return axios.post(
            `${API_BASE_URL}/api/tasks/${task_uid}/subtasks`,
            {
              title: subtask.title,
              due_date: subtask.due_date
            },
            config
          );
        } else {
          return Promise.resolve();
        }
      });
      await Promise.all(subtaskPromises);
      return true;
    },
    {
      onSuccess: () => {
        navigate(`/tasks/${task_uid}`);
      },
      onError: (error: any) => {
        setErrorMessage("Failed to update task. Please try again.");
      }
    }
  );

  // Handlers for form fields
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubtaskChange = (index: number, field: keyof Subtask, value: string) => {
    setFormData((prev) => {
      const updatedSubtasks = [...prev.subtasks];
      updatedSubtasks[index] = { ...updatedSubtasks[index], [field]: value };
      return { ...prev, subtasks: updatedSubtasks };
    });
  };

  const addSubtask = () => {
    setFormData((prev) => ({
      ...prev,
      subtasks: [...prev.subtasks, { title: "", due_date: "" }]
    }));
  };

  const removeSubtask = async (index: number) => {
    const subtaskToRemove = formData.subtasks[index];
    // If the subtask exists on the server, call API to delete it immediately.
    if (subtaskToRemove.uid) {
      try {
        const config = { headers: { Authorization: `Bearer ${auth_token}` } };
        await axios.delete(`${API_BASE_URL}/api/subtasks/${subtaskToRemove.uid}`, config);
      } catch (err) {
        console.error("Error deleting subtask:", err);
      }
    }
    setFormData((prev) => {
      const updatedSubtasks = prev.subtasks.filter((_, i) => i !== index);
      return { ...prev, subtasks: updatedSubtasks };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Basic client-side validation: title must not be empty.
    if (!formData.title.trim()) {
      setErrorMessage("Task title is required.");
      return;
    }
    setErrorMessage(null);
    updateTaskMutation.mutate(formData);
  };

  const handleCancel = () => {
    navigate(`/tasks/${task_uid}`);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (isError) {
    return <div className="text-red-500">Error loading task data.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Edit Task</h1>
      {errorMessage && <div className="mb-4 text-red-500">{errorMessage}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Title <span className="text-red-500">*</span></label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            rows={4}
          />
        </div>
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <input
              type="date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Priority</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Project ID</label>
            <input
              type="text"
              name="project_uid"
              value={formData.project_uid}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              placeholder="Enter project UID if applicable"
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Tags</label>
          <input
            type="text"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            placeholder="Comma-separated tags"
          />
        </div>
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Subtasks</h2>
          {formData.subtasks.map((subtask, index) => (
            <div key={subtask.uid || `new-${index}`} className="flex items-center mb-2 space-x-2">
              <input
                type="text"
                value={subtask.title}
                onChange={(e) => handleSubtaskChange(index, "title", e.target.value)}
                className="flex-1 border px-2 py-1 rounded"
                placeholder="Subtask Title"
              />
              <input
                type="date"
                value={subtask.due_date}
                onChange={(e) => handleSubtaskChange(index, "due_date", e.target.value)}
                className="border px-2 py-1 rounded"
              />
              <button
                type="button"
                onClick={() => removeSubtask(index)}
                className="text-red-500 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addSubtask}
            className="mt-2 text-blue-500 hover:underline"
          >
            + Add Subtask
          </button>
        </div>
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateTaskMutation.isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {updateTaskMutation.isLoading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
      <div className="mt-4">
        <Link to={`/tasks/${task_uid}`} className="text-blue-500 hover:underline">
          Back to Task Details
        </Link>
      </div>
    </div>
  );
};

export default UV_Task_Edit;