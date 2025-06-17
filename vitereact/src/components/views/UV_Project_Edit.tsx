import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useAppStore } from "@/store/main";

// Define interface for project details returned from backend
interface Project {
  uid: string;
  user_uid: string;
  title: string;
  description: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

// Define local form state interface
interface ProjectForm {
  title: string;
  description: string;
}

const UV_Project_Edit: React.FC = () => {
  const { project_uid } = useParams<{ project_uid: string }>();
  const navigate = useNavigate();
  const auth_token = useAppStore((state) => state.auth_token);

  const [projectForm, setProjectForm] = useState<ProjectForm>({ title: "", description: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch project data on page load using react-query
  const { data, isLoading, isError, error } = useQuery<Project, Error>(
    ["project", project_uid],
    async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/projects/${project_uid}`,
        {
          headers: { Authorization: `Bearer ${auth_token}` }
        }
      );
      return response.data;
    },
    {
      enabled: !!project_uid && !!auth_token
    }
  );

  // When data is fetched, update local state for form
  useEffect(() => {
    if (data) {
      setProjectForm({ title: data.title, description: data.description });
    }
  }, [data]);

  // Mutation for updating project data
  const updateProjectMutation = useMutation<Project, Error, ProjectForm>(
    async (updatedData) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/projects/${project_uid}`,
        updatedData,
        {
          headers: { Authorization: `Bearer ${auth_token}` }
        }
      );
      return response.data;
    },
    {
      onSuccess: () => {
        // Navigate back to project details view upon successful update
        navigate(`/projects/${project_uid}`);
      },
      onError: (err: unknown) => {
        let errorMessage = 'Failed to update project';
        if (axios.isAxiosError(err)) {
          errorMessage = err.response?.data?.message || err.message || errorMessage;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        setFormErrors({ submit: errorMessage });
      }
    }
  );

  // Handle input change for both title and description
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProjectForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission with basic validation
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Validate that title field is not empty
    if (!projectForm.title.trim()) {
      setFormErrors({ title: "Title is required" });
      return;
    }
    setFormErrors({});
    updateProjectMutation.mutate(projectForm);
  };

  // Cancel editing and navigate back to project details view
  const handleCancel = () => {
    navigate(`/projects/${project_uid}`);
  };

  return (
    <>
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <p>Loading project data...</p>
        </div>
      ) : isError ? (
        <div className="text-red-500" role="alert">
          Error: {(error as Error).message}
        </div>
      ) : (
        <div className="max-w-xl mx-auto bg-white p-6 rounded shadow">
          <h1 className="text-2xl font-semibold mb-4">Edit Project</h1>
          {formErrors.submit && (
            <div className="mb-4 p-2 bg-red-100 text-red-700 border border-red-400 rounded" role="alert">
              {formErrors.submit}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-gray-700 font-medium mb-1">
                Project Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={projectForm.title}
                onChange={handleInputChange}
                autoFocus
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formErrors.title && (
                <p className="text-red-500 text-sm mt-1" role="alert">
                  {formErrors.title}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="description" className="block text-gray-700 font-medium mb-1">
                Project Description
              </label>
              <textarea
                id="description"
                name="description"
                value={projectForm.description}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={handleCancel}
                className="py-2 px-4 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateProjectMutation.isLoading}
                className="py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {updateProjectMutation.isLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
          <div className="mt-4">
            <Link to={`/projects/${project_uid}`} className="text-blue-500 hover:underline">
              Back to Project Details
            </Link>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_Project_Edit;