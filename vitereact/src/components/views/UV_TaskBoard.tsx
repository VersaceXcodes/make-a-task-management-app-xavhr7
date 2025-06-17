import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAppStore } from "@/store/main";

// Define interfaces based on the provided data map
interface TaskItem {
  task_id: string;
  title: string;
  due_date: string;
  priority: string;
  assignees: string[];
  status?: string;
}

interface BoardTasks {
  to_do: TaskItem[];
  in_progress: TaskItem[];
  completed: TaskItem[];
}

interface DragState {
  dragged_task_id: string;
  source_column: string;
  target_column: string;
}

const UV_TaskBoard: React.FC = () => {
  // Get authentication token from global state
  const token = useAppStore((state) => state.auth_state.token);

  // Local state for board tasks and drag state
  const [boardTasks, setBoardTasks] = useState<BoardTasks>({
    to_do: [],
    in_progress: [],
    completed: []
  });
  const [dragState, setDragState] = useState<DragState>({
    dragged_task_id: "",
    source_column: "",
    target_column: ""
  });

  // Fetch board tasks from backend and group them based on task status (map pending to to_do)
  const fetchBoardTasks = async (): Promise<BoardTasks> => {
    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/tasks`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    const tasks: TaskItem[] = response.data.tasks;
    const grouped: BoardTasks = { to_do: [], in_progress: [], completed: [] };
    tasks.forEach((task) => {
      if (task.status === "pending") {
        grouped.to_do.push(task);
      } else if (task.status === "in_progress") {
        grouped.in_progress.push(task);
      } else if (task.status === "completed") {
        grouped.completed.push(task);
      }
    });
    return grouped;
  };

  // Use react-query to fetch board tasks on view load
  const { data, isLoading, refetch } = useQuery<BoardTasks>({
    queryKey: ["board_tasks"],
    queryFn: fetchBoardTasks,
    onSuccess: (data) => {
      setBoardTasks(data);
    },
    enabled: !!token
  });

  // Mutation for updating a task’s status on backend
  const mutation = useMutation(
    async ({ task_id, status }: { task_id: string; status: string }) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/tasks/${task_id}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    {
      onSuccess: () => {
        // Optionally, refetch the tasks to ensure consistency
        refetch();
      },
      onError: (error) => {
        console.error("Error updating task status:", error);
      }
    }
  );

  // Handler for drag start event on a task card
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string, sourceColumn: string) => {
    setDragState({ dragged_task_id: taskId, source_column: sourceColumn, target_column: "" });
  };

  // Allow dragging over drop zones
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Handler for drop event on a column container
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetColumn: string) => {
    e.preventDefault();
    // Update drag state with target column
    setDragState((prev) => ({ ...prev, target_column: targetColumn }));

    const sourceColumn = dragState.source_column;
    if (!sourceColumn) return; // Nothing to drop if source column is not set

    const task = boardTasks[sourceColumn as keyof BoardTasks].find(
      (t) => t.task_id === dragState.dragged_task_id
    );
    if (!task) return;

    // If dropped in the same column, no action is needed
    if (sourceColumn === targetColumn) return;

    // Determine new status based on the target column
    let newStatus = targetColumn === "to_do" ? "pending" : targetColumn;

    // Optimistically update the UI: Remove task from source and add to target
    setBoardTasks((prev) => {
      const updatedSource = prev[sourceColumn as keyof BoardTasks].filter(
        (t) => t.task_id !== task.task_id
      );
      const updatedTarget = [...prev[targetColumn as keyof BoardTasks], { ...task, status: newStatus }];
      return { ...prev, [sourceColumn]: updatedSource, [targetColumn]: updatedTarget };
    });

    // Call the mutation to update the backend
    mutation.mutate({ task_id: task.task_id, status: newStatus });

    // Reset the drag state
    setDragState({ dragged_task_id: "", source_column: "", target_column: "" });
  };

  return (
    <>
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold mb-4">Task Board (Kanban)</h1>
        {isLoading ? (
          <div className="text-center">Loading tasks...</div>
        ) : (
          <div className="flex flex-col md:flex-row gap-4">
            {/* Column for "To Do" */}
            <div
              className="flex-1 bg-gray-50 p-4 rounded shadow min-h-[300px]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, "to_do")}
            >
              <h2 className="text-xl font-semibold mb-2">To Do</h2>
              {boardTasks.to_do.length === 0 ? (
                <p className="text-gray-500">No tasks here.</p>
              ) : (
                boardTasks.to_do.map((task) => (
                  <div
                    key={task.task_id}
                    className="bg-white p-3 mb-3 rounded border hover:shadow-lg transition duration-150 cursor-move"
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.task_id, "to_do")}
                  >
                    <Link to={`/tasks/${task.task_id}`} className="block">
                      <h3 className="font-bold">{task.title}</h3>
                      <p className="text-sm text-gray-600">Due: {task.due_date || "N/A"}</p>
                      <p className="text-sm text-gray-600">Priority: {task.priority}</p>
                      {task.assignees && task.assignees.length > 0 && (
                        <p className="text-sm text-gray-600">Assignees: {task.assignees.join(", ")}</p>
                      )}
                    </Link>
                  </div>
                ))
              )}
            </div>
            {/* Column for "In Progress" */}
            <div
              className="flex-1 bg-gray-50 p-4 rounded shadow min-h-[300px]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, "in_progress")}
            >
              <h2 className="text-xl font-semibold mb-2">In Progress</h2>
              {boardTasks.in_progress.length === 0 ? (
                <p className="text-gray-500">No tasks here.</p>
              ) : (
                boardTasks.in_progress.map((task) => (
                  <div
                    key={task.task_id}
                    className="bg-white p-3 mb-3 rounded border hover:shadow-lg transition duration-150 cursor-move"
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.task_id, "in_progress")}
                  >
                    <Link to={`/tasks/${task.task_id}`} className="block">
                      <h3 className="font-bold">{task.title}</h3>
                      <p className="text-sm text-gray-600">Due: {task.due_date || "N/A"}</p>
                      <p className="text-sm text-gray-600">Priority: {task.priority}</p>
                      {task.assignees && task.assignees.length > 0 && (
                        <p className="text-sm text-gray-600">Assignees: {task.assignees.join(", ")}</p>
                      )}
                    </Link>
                  </div>
                ))
              )}
            </div>
            {/* Column for "Completed" */}
            <div
              className="flex-1 bg-gray-50 p-4 rounded shadow min-h-[300px]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, "completed")}
            >
              <h2 className="text-xl font-semibold mb-2">Completed</h2>
              {boardTasks.completed.length === 0 ? (
                <p className="text-gray-500">No tasks here.</p>
              ) : (
                boardTasks.completed.map((task) => (
                  <div
                    key={task.task_id}
                    className="bg-white p-3 mb-3 rounded border hover:shadow-lg transition duration-150 cursor-move"
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.task_id, "completed")}
                  >
                    <Link to={`/tasks/${task.task_id}`} className="block">
                      <h3 className="font-bold">{task.title}</h3>
                      <p className="text-sm text-gray-600">Due: {task.due_date || "N/A"}</p>
                      <p className="text-sm text-gray-600">Priority: {task.priority}</p>
                      {task.assignees && task.assignees.length > 0 && (
                        <p className="text-sm text-gray-600">Assignees: {task.assignees.join(", ")}</p>
                      )}
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_TaskBoard;