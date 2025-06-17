import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/main";

// Define interfaces for Task, Subtask, and ActivityLog
interface Task {
  uid: string;
  title: string;
  description: string;
  due_date: string;
  priority: string;
  status: string;
}

interface Subtask {
  uid: string;
  title: string;
  due_date: string;
  status: string;
}

interface ActivityLog {
  action: string;
  details: string;
  timestamp: string;
}

const UV_Task_Details: React.FC = () => {
  const { task_uid } = useParams<{ task_uid: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authToken = useAppStore((state) => state.auth_token);

  // Check for missing task_uid parameter
  if (!task_uid) {
    return <div>Error: Missing task identifier.</div>;
  }

  // Base API URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  // Fetch task details
  const fetchTask = async (): Promise<Task> => {
    const response = await axios.get(
      `${API_BASE_URL}/api/tasks/${task_uid}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    return response.data;
  };

  // Fetch subtasks
  const fetchSubtasks = async (): Promise<Subtask[]> => {
    const response = await axios.get(
      `${API_BASE_URL}/api/tasks/${task_uid}/subtasks`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    return response.data;
  };

  // Fetch activity logs
  const fetchActivityLogs = async (): Promise<ActivityLog[]> => {
    const response = await axios.get(
      `${API_BASE_URL}/api/tasks/${task_uid}/activity`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    return response.data;
  };

  const { data: task, isLoading: taskLoading, isError: taskError, error: taskErr } = useQuery<Task, Error>(
    ["task", task_uid],
    fetchTask
  );
  const { data: subtasks, isLoading: subtasksLoading, isError: subtasksError } = useQuery<Subtask[], Error>(
    ["subtasks", task_uid],
    fetchSubtasks
  );
  const { data: activity_logs, isLoading: logsLoading, isError: logsError } = useQuery<ActivityLog[], Error>(
    ["activity_logs", task_uid],
    fetchActivityLogs
  );

  // Mutation to mark the task as complete
  const markCompleteMutation = useMutation(
    () =>
      axios.put(
        `${API_BASE_URL}/api/tasks/${task_uid}`,
        { status: "completed" },
        { headers: { Authorization: `Bearer ${authToken}` } }
      ),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["task", task_uid]);
      }
    }
  );

  // Mutation to delete the task
  const deleteTaskMutation = useMutation(
    () =>
      axios.delete(`${API_BASE_URL}/api/tasks/${task_uid}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      }),
    {
      onSuccess: () => {
        navigate("/tasks");
      }
    }
  );

  const handleMarkTaskComplete = () => {
    if (task && task.status === "completed") {
      alert("Task is already completed.");
      return;
    }
    markCompleteMutation.mutate();
  };

  const handleEdit = () => {
    navigate(`/tasks/${task_uid}/edit`);
  };

  const handleDeleteTask = () => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      deleteTaskMutation.mutate();
    }
  };

  if (taskLoading || subtasksLoading || logsLoading) {
    return <div>Loading...</div>;
  }

  if (taskError || subtasksError || logsError) {
    return (
      <div>
        Error:{" "}
        {taskErr?.message || (subtasksError as Error)?.message || (logsError as Error)?.message}
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{task?.title}</h1>
        <p className="mt-2 text-gray-700">{task?.description}</p>
      </div>
      <div className="mb-6">
        <p>
          <span className="font-semibold">Due Date: </span>
          {task?.due_date || "N/A"}
        </p>
        <p>
          <span className="font-semibold">Priority: </span>
          {task?.priority}
        </p>
        <p>
          <span className="font-semibold">Status: </span>
          {task?.status}
        </p>
      </div>
      <div className="mb-6 space-x-3">
        <button
          type="button"
          onClick={handleMarkTaskComplete}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Mark as Complete
        </button>
        <button
          type="button"
          onClick={handleEdit}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Edit Task
        </button>
        <button
          type="button"
          onClick={handleDeleteTask}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Delete Task
        </button>
        <Link
          to="/tasks"
          className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
        >
          Back to Tasks
        </Link>
      </div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Subtasks</h2>
        {subtasks && subtasks.length > 0 ? (
          <ul className="list-disc ml-6 mt-2">
            {subtasks.map((subtask) => (
              <li key={subtask.uid} className="mb-1">
                <span className="font-semibold">{subtask.title}</span>{" "}
                - {subtask.due_date || "No due date"} - {subtask.status}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2">No subtasks available.</p>
        )}
      </div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Activity Log</h2>
        {activity_logs && activity_logs.length > 0 ? (
          <ul className="list-disc ml-6 mt-2">
            {activity_logs.map((log, index) => (
              <li key={index} className="mb-1">
                <span className="font-semibold">{log.action}</span>: {log.details}{" "}
                <span className="text-sm text-gray-500">({log.timestamp})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2">No activity logs available.</p>
        )}
      </div>
    </>
  );
};

export default UV_Task_Details;