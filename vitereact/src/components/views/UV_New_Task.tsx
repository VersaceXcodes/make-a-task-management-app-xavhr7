import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAppStore } from "@/store/main";

interface SubtaskForm {
  title: string;
  due_date: string;
}

interface NewTaskForm {
  title: string;
  description: string;
  due_date: string;
  priority: string;
  project_uid: string;
  tags: string;
  subtasks: SubtaskForm[];
}

interface Project {
  uid: string;
  title: string;
}

const UV_New_Task: React.FC = () => {
  const auth_token = useAppStore((state) => state.auth_token);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Initialize form data with defaults (priority set to 'low' to match API expectations)
  const [formData, setFormData] = useState<NewTaskForm>({
    title: "",
    description: "",
    due_date: "",
    priority: "low", // using "low" since backend priority expects low/medium/high
    project_uid: "",
    tags: "",
    subtasks: []
  });

  // Fetch projects with error handling
  const { data: projects, error: projectsError } = useQuery<Project[], Error>(
    ["projects"],
    async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/projects`,
        { headers: { Authorization: `Bearer ${auth_token}` } }
      );
      return response.data;
    }
  );

  // Mutation function to submit the new task to the backend
  const createTaskMutation = useMutation(
    async (newTask: NewTaskForm) => {
      const payload = {
        title: newTask.title,
        description: newTask.description,
        due_date: newTask.due_date || null,
        priority: newTask.priority,
        status: "to_do", // setting default status on task creation
        project_uid: newTask.project_uid || null,
        assigned_to_uid: null,
        order_index: null,
        tags: newTask.tags,
        subtasks: newTask.subtasks.map((sub) => ({
          title: sub.title,
          due_date: sub.due_date || null,
        })),
      };
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/tasks`,
        payload,
        { headers: { Authorization: `Bearer ${auth_token}` } }
      );
      return response.data;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        navigate("/tasks");
      },
      onError: (error: any) => {
        alert("Task creation failed: " + (error.response?.data?.message || error.message));
      },
    }
  );

  // Handle form submission – validate and submit data
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("Title is required");
      return;
    }
    for (const subtask of formData.subtasks) {
      if (!subtask.title.trim()) {
        alert("Each subtask must have a title");
        return;
      }
    }
    createTaskMutation.mutate(formData);
  };

  // Generic change handler for inputs/selects/textareas
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle changes in subtask fields
  const handleSubtaskChange = (index: number, field: keyof SubtaskForm, value: string) => {
    const newSubtasks = [...formData.subtasks];
    newSubtasks[index] = { ...newSubtasks[index], [field]: value };
    setFormData((prev) => ({ ...prev, subtasks: newSubtasks }));
  };

  // Append a new empty subtask to the formData
  const addSubtaskField = () => {
    setFormData((prev) => ({
      ...prev,
      subtasks: [...prev.subtasks, { title: "", due_date: "" }],
    }));
  };

  return (
    <>
      <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Create New Task</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title<span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded p-2"
              required
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded p-2"
              rows={4}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
                Due Date
              </label>
              <input
                id="due_date"
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded p-2"
              />
            </div>
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded p-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="project_uid" className="block text-sm font-medium text-gray-700">
              Project Association
            </label>
            <select
              id="project_uid"
              name="project_uid"
              value={formData.project_uid}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded p-2"
            >
              <option value="">Select a project</option>
              {projectsError && (
                <option value="" disabled>
                  Failed to load projects
                </option>
              )}
              {projects &&
                projects.map((project) => (
                  <option key={project.uid} value={project.uid}>
                    {project.title}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
              Tags
            </label>
            <input
              id="tags"
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded p-2"
              placeholder="Enter tags separated by commas"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Subtasks</label>
            {formData.subtasks.map((subtask, index) => (
              <div key={index} className="flex space-x-2 mt-2">
                <input
                  id={`subtask-title-${index}`}
                  type="text"
                  placeholder="Subtask title"
                  value={subtask.title}
                  onChange={(e) =>
                    handleSubtaskChange(index, "title", e.target.value)
                  }
                  className="flex-1 border border-gray-300 rounded p-2"
                  required
                />
                <input
                  id={`subtask-due_date-${index}`}
                  type="date"
                  placeholder="Due date"
                  value={subtask.due_date}
                  onChange={(e) =>
                    handleSubtaskChange(index, "due_date", e.target.value)
                  }
                  className="w-40 border border-gray-300 rounded p-2"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={addSubtaskField}
              className="mt-2 text-blue-500 hover:underline"
            >
              Add Subtask
            </button>
          </div>
          <div className="pt-4">
            <button
              type="submit"
              disabled={createTaskMutation.isLoading}
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              {createTaskMutation.isLoading ? "Creating Task..." : "Create Task"}
            </button>
          </div>
        </form>
        <div className="mt-4">
          <Link to="/tasks" className="text-blue-500 hover:underline">
            Back to Task List
          </Link>
        </div>
      </div>
    </>
  );
};

export default UV_New_Task;