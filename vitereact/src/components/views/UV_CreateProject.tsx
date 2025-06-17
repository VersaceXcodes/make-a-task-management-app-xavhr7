import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { useAppStore } from "@/store/main";

// Define interface for the project form payload
interface ProjectForm {
  title: string;
  description: string;
  due_date: string; // optional, empty string if not provided
}

// Define interface for the response from POST /api/projects
interface ProjectResponse {
  message: string;
  project: {
    project_id: string;
    title: string;
    description: string;
    due_date: string;
  };
}

const UV_CreateProject: React.FC = () => {
  const navigate = useNavigate();
  
  // Access auth_state for JWT token
  const auth_state = useAppStore((state) => state.auth_state);
  
  // Local state for form, validation errors and error message
  const [project_form, setProjectForm] = useState<ProjectForm>({
    title: "",
    description: "",
    due_date: ""
  });
  
  const [validation_errors, setValidationErrors] = useState<{
    title?: string;
    description?: string;
    due_date?: string;
  }>({});
  
  const [error_message, setErrorMessage] = useState<string>("");

  // Define the mutation to POST the new project data to the backend
  const mutation = useMutation<ProjectResponse, any, ProjectForm>(
    async (newProject: ProjectForm) => {
      const url = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/projects`;
      const response = await axios.post(url, newProject, {
        headers: { Authorization: `Bearer ${auth_state.token}` }
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        // On success, navigate to the Project List view (UV_ProjectList)
        navigate("/projects");
      },
      onError: (error: any) => {
        if (error.response && error.response.data && error.response.data.message) {
          setErrorMessage(error.response.data.message);
        } else {
          setErrorMessage("An unexpected error occurred while creating the project.");
        }
      }
    }
  );

  // Handle input changes for form fields
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProjectForm((prev) => ({ ...prev, [name]: value }));
    // Clear the error message for the changed field
    setValidationErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // Handle form submission with inline validation
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let errors: { title?: string } = {};

    if (!project_form.title.trim()) {
      errors.title = "Project title is required";
    }
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setErrorMessage("");
    mutation.mutate(project_form);
  };

  return (
    <>
      <div className="max-w-xl mx-auto my-8 p-6 bg-white border rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Create New Project</h1>
        {error_message && (
          <div className="mb-4 p-2 border border-red-400 text-red-600 rounded">
            {error_message}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-gray-700">
              Project Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={project_form.title}
              onChange={handleChange}
              placeholder="Enter project title"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
            />
            {validation_errors.title && (
              <span className="text-red-500 text-sm">{validation_errors.title}</span>
            )}
          </div>
          <div className="mb-4">
            <label htmlFor="description" className="block text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={project_form.description}
              onChange={handleChange}
              placeholder="Enter project description"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
              rows={4}
            ></textarea>
            {validation_errors.description && (
              <span className="text-red-500 text-sm">{validation_errors.description}</span>
            )}
          </div>
          <div className="mb-4">
            <label htmlFor="due_date" className="block text-gray-700">
              Due Date
            </label>
            <input
              type="date"
              id="due_date"
              name="due_date"
              value={project_form.due_date}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
            />
            {validation_errors.due_date && (
              <span className="text-red-500 text-sm">{validation_errors.due_date}</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              disabled={mutation.isLoading}
            >
              {mutation.isLoading ? "Creating..." : "Create Project"}
            </button>
            <Link to="/projects" className="text-blue-600 hover:underline">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </>
  );
};

export default UV_CreateProject;