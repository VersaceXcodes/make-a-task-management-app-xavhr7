import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { useAppStore } from "@/store/main";

// Define interfaces for the project creation payload and response
interface NewProjectPayload {
  title: string;
  description?: string;
}

interface Project {
  uid: string;
  user_uid: string;
  title: string;
  description: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

const UV_New_Project: React.FC = () => {
  // Local state for form fields and errors, and success message
  const [projectForm, setProjectForm] = useState<NewProjectPayload>({
    title: "",
    description: ""
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Access the global auth_token from Zustand store
  const auth_token = useAppStore((state) => state.auth_token);

  // useMutation hook for POST /api/projects
  const mutation = useMutation<Project, Error, NewProjectPayload>({
    mutationFn: async (newProject: NewProjectPayload): Promise<Project> => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/projects`,
        newProject,
        {
          headers: { Authorization: `Bearer ${auth_token}` }
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      // On success, clear form and set a success message
      setSuccessMessage("Project created successfully!");
      setProjectForm({ title: "", description: "" });
      setFormErrors({});
    },
    onError: (error) => {
      // On error, you can set a general error message or field specific errors
      setFormErrors({ general: error.message || "Project creation failed" });
    }
  });

  // Handler for form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Reset previous errors and success message
    setFormErrors({});
    setSuccessMessage(null);
    // Simple inline validation for required title
    if (!projectForm.title.trim()) {
      setFormErrors({ title: "Project title is required" });
      return;
    }
    // Submit the project form using mutation
    mutation.mutate(projectForm);
  };

  return (
    <>
      <div className="max-w-md mx-auto my-8 p-6 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4">New Project</h1>
        {successMessage && (
          <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">
            {successMessage}
          </div>
        )}
        {formErrors.general && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {formErrors.general}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">
              Project Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={projectForm.title}
              onChange={(e) =>
                setProjectForm({ ...projectForm, title: e.target.value })
              }
            />
            {formErrors.title && (
              <p className="text-red-500 text-sm mt-1">{formErrors.title}</p>
            )}
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={projectForm.description}
              onChange={(e) =>
                setProjectForm({ ...projectForm, description: e.target.value })
              }
              rows={4}
            ></textarea>
          </div>
          <div className="flex justify-end space-x-3">
            <Link
              to="/projects"
              className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={mutation.isLoading}
            >
              {mutation.isLoading ? "Submitting..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default UV_New_Project;