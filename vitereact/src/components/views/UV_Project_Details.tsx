import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAppStore } from "@/store/main";

// Define interfaces for project and task
interface Project {
  uid: string;
  title: string;
  description: string;
  archived: boolean;
}

interface Task {
  uid: string;
  title: string;
  status: string;
}

interface TaskFilter {
  status?: string;
}

const UV_Project_Details: React.FC = () => {
  const { project_uid } = useParams<{ project_uid: string }>();
  const navigate = useNavigate();
  const auth_token = useAppStore((state) => state.auth_token);
  const queryClient = useQueryClient();

  // Local state for managing task filter settings
  const [taskFilter, setTaskFilter] = useState<TaskFilter>({});

  // Function to fetch project details using the project_uid slug
  const fetchProjectDetails = async (projUid: string): Promise<Project> => {
    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/projects/${projUid}`,
      { headers: { Authorization: `Bearer ${auth_token}` } }
    );
    return response.data;
  };

  // Function to fetch tasks associated with the project (plus optional status filter)
  const fetchProjectTasks = async (projUid: string, filter: TaskFilter): Promise<Task[]> => {
    let url = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/tasks?project_uid=${projUid}`;
    if (filter.status) {
      url += `&status=${filter.status}`;
    }
    const response = await axios.get(url, { headers: { Authorization: `Bearer ${auth_token}` } });
    return response.data;
  };

  // Query to fetch the project details
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useQuery<Project, Error>(
    ["project", project_uid],
    () => fetchProjectDetails(project_uid!),
    { enabled: !!project_uid }
  );

  // Query to fetch tasks for the project with applied filter(s)
  const {
    data: tasks,
    isLoading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
  } = useQuery<Task[], Error>(
    ["projectTasks", project_uid, taskFilter.status],
    () => fetchProjectTasks(project_uid!, taskFilter),
    { enabled: !!project_uid }
  );

  // Set up a mutation for deleting the project.
  const deleteProjectMutation = useMutation(
    () =>
      axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/projects/${project_uid}`,
        { headers: { Authorization: `Bearer ${auth_token}` } }
      ),
    {
      onSuccess: () => {
        // Invalidate queries if needed then navigate to project list
        queryClient.invalidateQueries(["projects"]);
        navigate("/projects");
      },
      onError: (error: any) => {
        console.error("Delete project error:", error);
      },
    }
  );

  // Handler to delete the project after confirmation
  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      deleteProjectMutation.mutate();
    }
  };

  // Handler to navigate to the project edit view
  const handleEdit = () => {
    navigate(`/projects/${project_uid}/edit`);
  };

  // When the task filter changes, refetch the tasks query
  useEffect(() => {
    refetchTasks();
  }, [taskFilter, refetchTasks]);

  return (
    <>
      {projectLoading ? (
        <div className="text-center text-xl">Loading project details...</div>
      ) : projectError ? (
        <div className="text-center text-red-500">
          Error loading project: {projectError.message}
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Project Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">{project?.title}</h1>
            <div className="space-x-3">
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
              >
                Edit Project
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
              >
                Delete Project
              </button>
            </div>
          </div>
          
          {/* Project Description */}
          <div>
            <p className="text-gray-700">{project?.description}</p>
            {project?.archived && (
              <span className="inline-block mt-2 px-3 py-1 text-sm text-gray-600 bg-gray-200 rounded">
                Archived
              </span>
            )}
          </div>
          
          {/* Task Filter */}
          <div className="mt-6">
            <label htmlFor="statusFilter" className="block font-medium text-gray-800">
              Filter tasks by status:
            </label>
            <select
              id="statusFilter"
              value={taskFilter.status || ""}
              onChange={(e) =>
                setTaskFilter({ status: e.target.value ? e.target.value : undefined })
              }
              className="mt-2 block w-full border border-gray-300 rounded p-2"
            >
              <option value="">All</option>
              <option value="to_do">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          {/* Tasks List */}
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">Project Tasks</h2>
            {tasksLoading ? (
              <div className="text-center">Loading tasks...</div>
            ) : tasksError ? (
              <div className="text-center text-red-500">
                Error loading tasks: {tasksError.message}
              </div>
            ) : tasks && tasks.length > 0 ? (
              <ul className="space-y-3">
                {tasks.map((task) => (
                  <li
                    key={task.uid}
                    className="p-4 border border-gray-200 rounded flex justify-between items-center"
                  >
                    <Link to={`/tasks/${task.uid}`} className="text-blue-600 hover:underline">
                      {task.title}
                    </Link>
                    <span className="text-sm text-gray-500 capitalize">
                      {task.status.replace("_", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-600">No tasks found for this project.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default UV_Project_Details;