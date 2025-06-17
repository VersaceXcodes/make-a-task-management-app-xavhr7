import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAppStore } from "@/store/main";

// Define TypeScript interfaces for the task detail structure
interface Subtask {
  subtask_id: string;
  title: string;
  is_completed: boolean;
}

interface Comment {
  comment_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
}

interface Assignee {
  user_id: string;
  name: string;
}

interface TaskDetail {
  task_id: string;
  title: string;
  description: string;
  due_date: string;
  priority: string;
  status: string;
  assignees: Assignee[];
  labels: string[];
  subtasks: Subtask[];
  comments: Comment[];
}

const UV_TaskDetail: React.FC = () => {
  // Get task_id from URL parameters
  const { task_id } = useParams<{ task_id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Access global auth state from Zustand store
  const auth_state = useAppStore((state) => state.auth_state);
  const token = auth_state.token;

  // Local state for new comment text
  const [newComment, setNewComment] = useState<string>("");

  // Function to fetch task details from backend
  const fetchTaskDetail = async (): Promise<TaskDetail> => {
    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/tasks/${task_id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.task;
  };

  // useQuery to fetch the task details on view load
  const {
    data: taskDetail,
    isLoading,
    error,
    refetch,
  } = useQuery<TaskDetail, Error>(
    ["task_detail", task_id],
    fetchTaskDetail,
    { enabled: !!task_id && !!token }
  );

  // Mutation to post a new comment for the task
  const postComment = async (comment_text: string): Promise<Comment> => {
    const response = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/tasks/${task_id}/comments`,
      { comment_text },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.comment;
  };

  const commentMutation = useMutation<Comment, Error, string>(
    (comment_text) => postComment(comment_text),
    {
      onSuccess: () => {
        // After posting a comment, clear the input and refetch task details to update comments
        setNewComment("");
        refetch();
      },
      onError: (err) => {
        console.error("Error posting comment:", err);
      },
    }
  );

  // Handler for form submission to post comment
  const handleCommentSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newComment.trim() === "") return;
    commentMutation.mutate(newComment);
  };

  // Handler for navigating to the Edit Task view
  const handleEdit = () => {
    navigate(`/tasks/edit/${task_id}`);
  };

  return (
    <>
      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">Error: {error.message}</div>
      ) : taskDetail ? (
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{taskDetail.title}</h1>
            <button
              onClick={handleEdit}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Edit
            </button>
          </div>
          <div>
            <p className="text-gray-700">{taskDetail.description}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>Due Date: </strong>
              {taskDetail.due_date}
            </div>
            <div>
              <strong>Priority: </strong>
              {taskDetail.priority}
            </div>
            <div>
              <strong>Status: </strong>
              {taskDetail.status}
            </div>
            <div>
              <strong>Labels: </strong>
              {taskDetail.labels.join(", ")}
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Assignees</h2>
            <ul className="list-disc list-inside">
              {taskDetail.assignees.map((assignee) => (
                <li key={assignee.user_id}>{assignee.name}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Subtasks</h2>
            <ul className="list-disc list-inside">
              {taskDetail.subtasks.map((subtask) => (
                <li key={subtask.subtask_id}>
                  <span
                    className={subtask.is_completed ? "line-through" : ""}
                  >
                    {subtask.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Comments</h2>
            <ul className="space-y-2">
              {taskDetail.comments.map((comment) => (
                <li key={comment.comment_id} className="border p-2 rounded">
                  <div className="text-sm text-gray-600">
                    <strong>{comment.user_id}</strong> on{" "}
                    {new Date(comment.created_at).toLocaleString()}
                  </div>
                  <div>{comment.comment_text}</div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Add a Comment</h2>
            <form
              onSubmit={handleCommentSubmit}
              className="mt-2 flex flex-col"
            >
              <textarea
                className="border rounded p-2 mb-2"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                placeholder="Write your comment here..."
              />
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                Post Comment
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">No task details available</div>
      )}
    </>
  );
};

export default UV_TaskDetail;