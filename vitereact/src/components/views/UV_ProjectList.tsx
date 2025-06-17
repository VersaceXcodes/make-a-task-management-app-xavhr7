import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Link } from "react-router-dom";
import { useAppStore } from "@/store/main";

// Define interface for a project
interface Project {
  project_id: string;
  title: string;
  description: string;
  due_date?: string;
}

// Fetch projects from backend using axios and the provided token for authorization
const fetchProjects = async (token: string): Promise<Project[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/projects`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data.projects;
};

const UV_ProjectList: React.FC = () => {
  // Retrieve JWT token from global authentication state using Zustand store
  const token = useAppStore((state) => state.auth_state.token);

  // Use react-query to fetch projects; the query only runs if token is available
  const { data, isLoading, isError, error, refetch } = useQuery<Project[], Error>(
    ["projects"],
    () => fetchProjects(token),
    { enabled: Boolean(token) }
  );

  return (
    <>
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Project List</h1>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
            onClick={() => refetch()}
          >
            Refresh
          </button>
        </div>

        {isLoading && (
          <div className="text-center text-gray-500">Loading projects...</div>
        )}

        {isError && (
          <div className="text-center text-red-500">
            Error: {error.message}
          </div>
        )}

        {!isLoading && data && data.length === 0 && (
          <div className="text-center text-gray-500">
            No projects found.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data && data.map((project) => (
            <Link
              key={project.project_id}
              to={`/projects/${project.project_id}`}
              className="block bg-white shadow-md rounded p-4 hover:shadow-lg transition"
            >
              <h2 className="text-xl font-semibold mb-2">{project.title}</h2>
              <p className="text-gray-700 mb-2">{project.description}</p>
              {project.due_date && (
                <p className="text-gray-500 text-sm">
                  Due Date: {new Date(project.due_date).toLocaleDateString()}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
};

export default UV_ProjectList;