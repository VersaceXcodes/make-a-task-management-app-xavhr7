import React, { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useAppStore } from "@/store/main";

interface Task {
  uid: string;
  title: string;
  due_date: string;
  priority: string;
  status: string;
}

const UV_Task_Kanban: React.FC = () => {
  const auth_token = useAppStore((state) => state.auth_token);
  const realtime_events = useAppStore((state) => state.realtime_events);
  const set_realtime_event = useAppStore((state) => state.set_realtime_event);

  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  // Function to fetch tasks from the backend
  const fetchTasks = async (): Promise<Task[]> => {
    const response = await axios.get(`${baseUrl}/api/tasks`, {
      headers: { Authorization: `Bearer ${auth_token}` },
    });
    return response.data;
  };

  const { data, isLoading, error, refetch } = useQuery<Task[], Error>(["tasks"], fetchTasks, {
    enabled: !!auth_token,
  });

  // Mutation to update a task's status (handle drag-and-drop)
  const updateTaskMutation = useMutation(
    async ({ uid, newStatus }: { uid: string; newStatus: string }) => {
      const payload = { status: newStatus, order_index: 0 };
      const response = await axios.put(`${baseUrl}/api/tasks/${uid}`, payload, {
        headers: { Authorization: `Bearer ${auth_token}` },
      });
      return response.data;
    },
    {
      onSuccess: () => {
        refetch();
      },
    }
  );

  // Mutation to delete a task
  const deleteTaskMutation = useMutation(
    async (uid: string) => {
      const response = await axios.delete(`${baseUrl}/api/tasks/${uid}`, {
        headers: { Authorization: `Bearer ${auth_token}` },
      });
      return response.data;
    },
    {
      onSuccess: () => {
        refetch();
      },
    }
  );

  // Group tasks into columns based on their status
  const columns = {
    to_do: data ? data.filter((task) => task.status === "to_do") : [],
    in_progress: data ? data.filter((task) => task.status === "in_progress") : [],
    completed: data ? data.filter((task) => task.status === "completed") : [],
  };

  // useEffect to listen to realtime events and refetch tasks when events occur
  useEffect(() => {
    if (
      realtime_events.task_status_updated ||
      realtime_events.task_created ||
      realtime_events.task_deleted
    ) {
      refetch();
      if (realtime_events.task_status_updated) {
        set_realtime_event("task_status_updated", false);
      }
      if (realtime_events.task_created) {
        set_realtime_event("task_created", false);
      }
      if (realtime_events.task_deleted) {
        set_realtime_event("task_deleted", false);
      }
    }
  }, [realtime_events, refetch, set_realtime_event]);

  // Handlers for dragging and dropping task cards
  const onDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
    e.dataTransfer.setData("application/json", JSON.stringify(task));
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: string) => {
    e.preventDefault();
    const taskData = e.dataTransfer.getData("application/json");
    if (taskData) {
      try {
        const draggedTask: Task = JSON.parse(taskData);
        if (draggedTask.status !== newStatus) {
          updateTaskMutation.mutate({ uid: draggedTask.uid, newStatus });
        }
      } catch (err) {
        console.error("Failed to parse dragged task data", err);
      }
    }
  };

  return (
    <>
      {isLoading && <div className="text-center text-lg">Loading tasks...</div>}
      {error && <div className="text-center text-red-500">Error: {(error as Error).message}</div>}
      {!isLoading && !error && (
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <div
            className="flex-1 bg-gray-100 p-4 rounded shadow"
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, "to_do")}
            role="list"
            aria-label="To Do tasks"
            tabIndex={0}
          >
            <h2 className="text-xl font-bold mb-4">To Do</h2>
            {columns.to_do.map((task) => (
              <div
                key={task.uid}
                className="bg-white p-3 mb-3 rounded shadow cursor-move"
                draggable
                onDragStart={(e) => onDragStart(e, task)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold">{task.title}</span>
                  <button
                    type="button"
                    className="text-red-500 text-sm"
                    onClick={() => deleteTaskMutation.mutate(task.uid)}
                  >
                    Delete
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : "N/A"}
                </div>
                <div className="mt-1">
                  {task.priority === "high" && (
                    <span className="bg-red-200 text-red-800 text-xs font-bold px-2 py-1 rounded">
                      High Priority
                    </span>
                  )}
                  {task.priority === "medium" && (
                    <span className="bg-yellow-200 text-yellow-800 text-xs font-bold px-2 py-1 rounded">
                      Medium Priority
                    </span>
                  )}
                  {task.priority === "low" && (
                    <span className="bg-green-200 text-green-800 text-xs font-bold px-2 py-1 rounded">
                      Low Priority
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div
            className="flex-1 bg-gray-100 p-4 rounded shadow"
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, "in_progress")}
            role="list"
            aria-label="In Progress tasks"
            tabIndex={0}
          >
            <h2 className="text-xl font-bold mb-4">In Progress</h2>
            {columns.in_progress.map((task) => (
              <div
                key={task.uid}
                className="bg-white p-3 mb-3 rounded shadow cursor-move"
                draggable
                onDragStart={(e) => onDragStart(e, task)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold">{task.title}</span>
                  <button
                    type="button"
                    className="text-red-500 text-sm"
                    onClick={() => deleteTaskMutation.mutate(task.uid)}
                  >
                    Delete
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : "N/A"}
                </div>
                <div className="mt-1">
                  {task.priority === "high" && (
                    <span className="bg-red-200 text-red-800 text-xs font-bold px-2 py-1 rounded">
                      High Priority
                    </span>
                  )}
                  {task.priority === "medium" && (
                    <span className="bg-yellow-200 text-yellow-800 text-xs font-bold px-2 py-1 rounded">
                      Medium Priority
                    </span>
                  )}
                  {task.priority === "low" && (
                    <span className="bg-green-200 text-green-800 text-xs font-bold px-2 py-1 rounded">
                      Low Priority
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div
            className="flex-1 bg-gray-100 p-4 rounded shadow"
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, "completed")}
            role="list"
            aria-label="Completed tasks"
            tabIndex={0}
          >
            <h2 className="text-xl font-bold mb-4">Completed</h2>
            {columns.completed.map((task) => (
              <div
                key={task.uid}
                className="bg-white p-3 mb-3 rounded shadow cursor-move"
                draggable
                onDragStart={(e) => onDragStart(e, task)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold">{task.title}</span>
                  <button
                    type="button"
                    className="text-red-500 text-sm"
                    onClick={() => deleteTaskMutation.mutate(task.uid)}
                  >
                    Delete
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : "N/A"}
                </div>
                <div className="mt-1">
                  {task.priority === "high" && (
                    <span className="bg-red-200 text-red-800 text-xs font-bold px-2 py-1 rounded">
                      High Priority
                    </span>
                  )}
                  {task.priority === "medium" && (
                    <span className="bg-yellow-200 text-yellow-800 text-xs font-bold px-2 py-1 rounded">
                      Medium Priority
                    </span>
                  )}
                  {task.priority === "low" && (
                    <span className="bg-green-200 text-green-800 text-xs font-bold px-2 py-1 rounded">
                      Low Priority
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default UV_Task_Kanban;