import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Link } from "react-router-dom";
import { useAppStore } from "@/store/main";

// Define interfaces for our data
interface TeamInvitation {
  uid: string;
  invitee_email: string;
  status: string;
  created_at: string;
}

interface TeamMember {
  uid: string;
  name: string;
  role: string;
}

interface TaskComment {
  uid: string;
  task_uid: string;
  user_uid: string;
  comment_text: string;
  created_at: string;
}

const UV_Team_Collaboration: React.FC = () => {
  // Get authentication token and user info from global state using Zustand.
  const { auth_token } = useAppStore((state) => ({
    auth_token: state.auth_token,
  }));

  // Local state variables according to the provided datamap.
  const [invitationEmail, setInvitationEmail] = useState<string>("");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("");
  const [commentText, setCommentText] = useState<string>("");

  // For demonstration purposes, we assume a dummy project and task id.
  const current_project_uid = "proj123";
  const current_task_uid = "task123";

  const queryClient = useQueryClient();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // Fetch team invitations.
  const {
    data: invitations,
    isLoading: invLoading,
    isError: invError,
    refetch: refetchInvitations,
  } = useQuery<TeamInvitation[]>({
    queryKey: ["team_invitations"],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/team_invitations`,
        { headers: { Authorization: `Bearer ${auth_token}` } }
      );
      return response.data;
    },
  });

  // Fetch team members.
  const {
    data: teamMembers,
    isLoading: membersLoading,
    isError: membersError,
    refetch: refetchTeamMembers,
  } = useQuery<TeamMember[]>({
    queryKey: ["team_members", current_project_uid],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/projects/${current_project_uid}/members`,
        { headers: { Authorization: `Bearer ${auth_token}` } }
      );
      return response.data;
    },
  });

  // Fetch task comments.
  const {
    data: comments,
    isLoading: commentsLoading,
    isError: commentsError,
    refetch: refetchComments,
  } = useQuery<TaskComment[]>({
    queryKey: ["task_comments", current_task_uid],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/tasks/${current_task_uid}/comments`,
        { headers: { Authorization: `Bearer ${auth_token}` } }
      );
      return response.data;
    },
  });

  // Mutation for sending an invitation.
  const sendInvitationMutation = useMutation({
    mutationFn: async (email: string) => {
      const payload = { project_uid: current_project_uid, invitee_email: email };
      const response = await axios.post(
        `${API_BASE_URL}/api/team_invitations`,
        payload,
        { headers: { Authorization: `Bearer ${auth_token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["team_invitations"]);
      setInvitationEmail("");
    },
  });

  // Mutation for posting a comment.
  const postCommentMutation = useMutation({
    mutationFn: async (comment: string) => {
      const payload = { comment_text: comment };
      const response = await axios.post(
        `${API_BASE_URL}/api/tasks/${current_task_uid}/comments`,
        payload,
        { headers: { Authorization: `Bearer ${auth_token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["task_comments", current_task_uid]);
      setCommentText("");
    },
  });

  // Simulated assign task action.
  const assignTask = () => {
    if (selectedAssignee) {
      alert(`Task assigned to team member with UID: ${selectedAssignee}`);
    } else {
      alert("Please select a team member to assign the task.");
    }
  };

  return (
    <>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Team Collaboration</h1>
        {/* Invitation Section */}
        <div className="mb-8 p-4 border rounded-md shadow-md">
          <h2 className="text-xl font-semibold mb-2">Invite a Team Member</h2>
          <div className="flex space-x-2">
            <input
              type="email"
              placeholder="Enter email"
              className="flex-1 p-2 border rounded-md"
              value={invitationEmail}
              onChange={(e) => setInvitationEmail(e.target.value)}
              aria-label="Invitation Email"
            />
            <button
              type="button"
              className="px-4 py-2 bg-blue-500 text-white rounded-md"
              onClick={() => sendInvitationMutation.mutate(invitationEmail)}
              disabled={sendInvitationMutation.isLoading || !invitationEmail}
            >
              {sendInvitationMutation.isLoading ? "Sending..." : "Send Invitation"}
            </button>
          </div>
          {sendInvitationMutation.isError && (
            <p className="text-red-500 mt-2">Failed to send invitation.</p>
          )}
        </div>
        {/* Pending Invitations List */}
        <div className="mb-8 p-4 border rounded-md shadow-md">
          <h2 className="text-xl font-semibold mb-2">Pending Invitations</h2>
          {invLoading ? (
            <p>Loading invitations...</p>
          ) : invError ? (
            <p className="text-red-500">Error loading invitations.</p>
          ) : invitations && invitations.length > 0 ? (
            <ul className="list-disc list-inside">
              {invitations.map((inv) => (
                <li key={inv.uid}>
                  {inv.invitee_email} - Status: {inv.status} - Sent at:{" "}
                  {new Date(inv.created_at).toLocaleString()}
                </li>
              ))}
            </ul>
          ) : (
            <p>No pending invitations.</p>
          )}
        </div>
        {/* Team Members List */}
        <div className="mb-8 p-4 border rounded-md shadow-md">
          <h2 className="text-xl font-semibold mb-2">Team Members</h2>
          {membersLoading ? (
            <p>Loading team members...</p>
          ) : membersError ? (
            <p className="text-red-500">Error loading team members.</p>
          ) : (
            <ul className="list-disc list-inside">
              {teamMembers && teamMembers.length > 0 ? (
                teamMembers.map((member) => (
                  <li key={member.uid}>
                    {member.name} - Role: {member.role}
                  </li>
                ))
              ) : (
                <p>No team members found.</p>
              )}
            </ul>
          )}
        </div>
        {/* Task Assignment Section */}
        <div className="mb-8 p-4 border rounded-md shadow-md">
          <h2 className="text-xl font-semibold mb-2">Assign Task</h2>
          <div className="flex space-x-2 items-center">
            <select
              className="p-2 border rounded-md flex-1"
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              aria-label="Select Team Member"
            >
              <option value="">Select team member</option>
              {teamMembers &&
                teamMembers.map((member) => (
                  <option key={member.uid} value={member.uid}>
                    {member.name} - {member.role}
                  </option>
                ))}
            </select>
            <button
              className="px-4 py-2 bg-green-500 text-white rounded-md"
              onClick={assignTask}
            >
              Assign Task
            </button>
          </div>
        </div>
        {/* Team Comments Section */}
        <div className="mb-8 p-4 border rounded-md shadow-md">
          <h2 className="text-xl font-semibold mb-2">Team Comments</h2>
          <div className="mb-4">
            {commentsLoading ? (
              <p>Loading comments...</p>
            ) : commentsError ? (
              <p className="text-red-500">Error loading comments.</p>
            ) : (
              <ul className="list-disc list-inside">
                {comments && comments.length > 0 ? (
                  comments.map((comment) => (
                    <li key={comment.uid} className="mb-2">
                      <p className="font-semibold">{comment.user_uid}:</p>
                      <p>{comment.comment_text}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(comment.created_at).toLocaleString()}
                      </p>
                    </li>
                  ))
                ) : (
                  <p>No comments yet.</p>
                )}
              </ul>
            )}
          </div>
          <div className="flex space-x-2 mt-4">
            <input
              type="text"
              placeholder="Enter your comment"
              className="flex-1 p-2 border rounded-md"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              aria-label="Comment Text"
            />
            <button
              className="px-4 py-2 bg-purple-500 text-white rounded-md"
              onClick={() => postCommentMutation.mutate(commentText)}
              disabled={postCommentMutation.isLoading || !commentText}
            >
              {postCommentMutation.isLoading ? "Posting..." : "Submit Comment"}
            </button>
          </div>
          {postCommentMutation.isError && (
            <p className="text-red-500 mt-2">Failed to post comment.</p>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_Team_Collaboration;