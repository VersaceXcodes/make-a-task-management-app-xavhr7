import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useAppStore } from "@/store/main";

// Define interfaces for Task and ProjectDetail based on the datamap
interface Task {
  task_id: string;
  title: string;
  status: string;
  due_date: string;
}

interface ProjectDetail {
  project_id: string;
  title: string;
  description: string;
  due_date?: string;
  tasks: Task[];
}

// Data fetching function that retrieves project details from the backend
const fetchProjectDetail = async (project_id: string, token: string): Promise<ProjectDetail> => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  const response = await axios.get(`${baseUrl}/api/projects/${project_id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  // Expect backend response of shape { project: ProjectDetail }
  return response.data.project;
};

const UV_ProjectDetail: React.FC = () => {
  // Extract project_id from URL parameters
  const { project_id } = useParams<{ project_id: string }>();
  const navigate = useNavigate();
  const token = useAppStore((state) => state.auth_state.token);

  // Use react-query to fetch project details on page load.
  const { data, isLoading, isError, error } = useQuery<ProjectDetail, Error>(
    ['project', project_id],
    () => {
      if (!project_id || !token) {
        return Promise.reject(new Error("Project ID or authentication token is missing."));
      }
      return fetchProjectDetail(project_id, token);
    },
    {
      enabled: !!project_id && !!token,
    }
  );

  // Handler for adding a task to the project.
  const handleAddTask = () => {
    if (project_id) {
      navigate(`/tasks/create?project_id=${project_id}`);
    }
  };

  return (
    <>
      {isLoading ? (
        <div className="text-center text-lg">Loading project details...</div>
      ) : isError ? (
        <div className="text-center text-red-500">
          {error.message || "An error occurred while fetching project details."}
        </div>
      ) : (
        <div className="max-w-4xl mx-auto p-4">
          {/* Project header with title and Add Task button */}
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">{data?.title}</h1>
            <button
              onClick={handleAddTask}
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
            >
              Add Task
            </button>
          </div>
          {/* Project description and due date */}
          <div className="mb-4">
            <p className="text-gray-700">{data?.description}</p>
            {data?.due_date && (
              <p className="text-gray-500 mt-2">
                Due Date: {new Date(data.due_date).toLocaleDateString()}
              </p>
            )}
          </div>
          {/* Tasks associated with the project */}
          <div>
            <h2 className="text-2xl font-semibold mb-2">Tasks</h2>
            {data?.tasks && data.tasks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b">Title</th>
                      <th className="py-2 px-4 border-b">Status</th>
                      <th className="py-2 px-4 border-b">Due Date</th>
                      <th className="py-2 px-4 border-b">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tasks.map((task) => (
                      <tr key={task.task_id} className="text-center">
                        <td className="py-2 px-4 border-b">{task.title}</td>
                        <td className="py-2 px-4 border-b">{task.status}</td>
                        <td className="py-2 px-4 border-b">
                          {new Date(task.due_date).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-4 border-b">
                          <Link
                            to={`/tasks/${task.task_id}`}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No tasks available for this project.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default UV_ProjectDetail;