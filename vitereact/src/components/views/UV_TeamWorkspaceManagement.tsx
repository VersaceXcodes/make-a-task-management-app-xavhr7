import React, { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import axios, { AxiosError } from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { use_app_store } from '@/store/main';
import { Link } from 'react-router-dom';

interface Workspace {
  workspace_id: number;
  workspace_name: string;
  description: string | null;
  role: 'owner' | 'admin' | 'member';
  is_personal: boolean;
}

interface Member {
  user_id: string;
  email: string;
  full_name: string | null;
  role: 'owner' | 'admin' | 'member';
  invitation_status: 'pending' | 'accepted';
  invited_at: string | null;
}

interface InvitationForm {
  email: string;
  role: 'admin' | 'member';
  validationErrors: Record<string, string>;
}

interface WorkspaceCreateForm {
  workspace_name: string;
  description: string;
  validationErrors: Record<string, string>;
}

const api_base_url = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const fetchWorkspaces = async (token: string): Promise<Workspace[]> => {
  // We assume an endpoint /api/workspaces/administered or just /workspaces
  // Use GET /workspaces returning all for user where role is owner/admin
  const { data } = await axios.get<Workspace[]>(`${api_base_url}/workspaces`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

const fetchMembers = async (workspace_id: number, token: string): Promise<Member[]> => {
  // Assume GET /workspaces/{workspace_id}/members
  const { data } = await axios.get<Member[]>(`${api_base_url}/workspaces/${workspace_id}/members`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

const createWorkspace = async (
  payload: { workspace_name: string; description: string },
  token: string
): Promise<Workspace> => {
  // POST /workspaces
  const { data } = await axios.post<Workspace>(
    `${api_base_url}/workspaces`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
};

const inviteMember = async (
  payload: { workspace_id: number; email: string; role: 'admin' | 'member' },
  token: string
): Promise<Member> => {
  const { workspace_id, email, role } = payload;
  // POST /workspaces/{workspace_id}/invite
  const { data } = await axios.post<Member>(
    `${api_base_url}/workspaces/${workspace_id}/invite`,
    { email, role },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
};

const changeMemberRole = async (
  payload: { workspace_id: number; user_id: string; role: 'owner' | 'admin' | 'member' },
  token: string
): Promise<Member> => {
  const { workspace_id, user_id, role } = payload;
  // PUT /workspaces/{workspace_id}/members/{user_id} with { role }
  const { data } = await axios.put<Member>(
    `${api_base_url}/workspaces/${workspace_id}/members/${user_id}`,
    { role },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
};

const removeMember = async (
  payload: { workspace_id: number; user_id: string },
  token: string
): Promise<void> => {
  const { workspace_id, user_id } = payload;
  // DELETE /workspaces/{workspace_id}/members/{user_id}
  await axios.delete(`${api_base_url}/workspaces/${workspace_id}/members/${user_id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

const resendInvitation = async (
  payload: { workspace_id: number; user_id: string },
  token: string
): Promise<void> => {
  const { workspace_id, user_id } = payload;
  // POST /workspaces/{workspace_id}/invitations/{user_id}/resend
  await axios.post(
    `${api_base_url}/workspaces/${workspace_id}/invitations/${user_id}/resend`,
    undefined,
    { headers: { Authorization: `Bearer ${token}` } }
  );
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UV_TeamWorkspaceManagement: React.FC = () => {
  const auth = use_app_store(state => state.auth);
  const user_profile = use_app_store(state => state.user_profile);
  // We get global workspaces for user (all roles including member, per global state)
  const globalWorkspaces = use_app_store(state => state.workspaces);
  // Query client for react-query cache invalidation
  const queryClient = useQueryClient();

  // Local state variables:
  // 1. Selected workspace
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);

  // 2. Members list for selected workspace
  const [members, setMembers] = useState<Member[]>([]);

  // 3. Workspace creation form
  const [workspaceCreateForm, setWorkspaceCreateForm] = useState<WorkspaceCreateForm>({
    workspace_name: '',
    description: '',
    validationErrors: {},
  });
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [workspaceCreateSuccess, setWorkspaceCreateSuccess] = useState<string | null>(null);

  // 4. Invitation form for selected workspace
  const [invitationForm, setInvitationForm] = useState<InvitationForm>({
    email: '',
    role: 'member',
    validationErrors: {},
  });
  const [isInviting, setIsInviting] = useState(false);

  // 5. Error message for global errors (invites or role changes)
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Controls for loading states
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Fetch members on selectedWorkspaceId change
  useEffect(() => {
    const loadMembers = async () => {
      if (selectedWorkspaceId === null) {
        setMembers([]);
        return;
      }
      setLoadingMembers(true);
      setErrorMessage(null);
      try {
        const membersData = await fetchMembers(selectedWorkspaceId, auth.token);
        setMembers(membersData);
      } catch (e) {
        setMembers([]);
        setErrorMessage(
          (e as AxiosError).response?.data?.error || 'Failed to load workspace members.'
        );
      } finally {
        setLoadingMembers(false);
      }
    };
    loadMembers();
  }, [selectedWorkspaceId, auth.token]);

  // Handle workspace selection from list
  const handleSelectWorkspace = (workspace_id: number) => {
    setSelectedWorkspaceId(workspace_id);
    setInvitationForm({ email: '', role: 'member', validationErrors: {} });
    setErrorMessage(null);
  };

  // Workspace creation form handlers
  const onWorkspaceCreateInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setWorkspaceCreateForm(prev => ({
      ...prev,
      [name]: value,
      validationErrors: { ...prev.validationErrors, [name]: '' },
    }));
    setWorkspaceCreateSuccess(null);
    setErrorMessage(null);
  };

  const validateWorkspaceCreateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!workspaceCreateForm.workspace_name.trim()) {
      errors.workspace_name = 'Workspace name is required.';
    }
    // Description optional, no validation needed
    setWorkspaceCreateForm(prev => ({ ...prev, validationErrors: errors }));
    return Object.keys(errors).length === 0;
  };

  const handleWorkspaceCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setWorkspaceCreateSuccess(null);
    if (!validateWorkspaceCreateForm()) return;
    setIsCreatingWorkspace(true);
    try {
      await createWorkspace(
        {
          workspace_name: workspaceCreateForm.workspace_name.trim(),
          description: workspaceCreateForm.description.trim() || '',
        },
        auth.token
      );
      // On success, refresh global workspaces by invalidating react-query or re-fetch from global store
      // Here, we do a fresh API fetch and update local/global state
      setWorkspaceCreateSuccess('Workspace created successfully.');
      // Refetch updated workspaces list from backend
      const updatedWorkspaces = await fetchWorkspaces(auth.token);
      // Update global state workspaces
      // setWorkspaces is from zustand global store
      use_app_store.getState().set_workspaces(updatedWorkspaces);
      // Clear form
      setWorkspaceCreateForm({ workspace_name: '', description: '', validationErrors: {} });
      // Optionally auto-select new workspace last in list
      if (updatedWorkspaces.length > 0) {
        const newWorkspace = updatedWorkspaces.find((w) => !globalWorkspaces.some(gw => gw.workspace_id === w.workspace_id));
        if (newWorkspace) {
          setSelectedWorkspaceId(newWorkspace.workspace_id);
        }
      }
    } catch (e) {
      setErrorMessage(
        (e as AxiosError).response?.data?.error || 'Error creating workspace.'
      );
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  // Invitation form handlers
  const onInvitationInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInvitationForm(prev => ({
      ...prev,
      [name]: value,
      validationErrors: { ...prev.validationErrors, [name]: '' },
    }));
    setErrorMessage(null);
  };

  const validateInvitationForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!invitationForm.email.trim()) {
      errors.email = 'Email is required.';
    } else if (!emailRegex.test(invitationForm.email.trim())) {
      errors.email = 'Invalid email address.';
    }
    if (!['admin', 'member'].includes(invitationForm.role)) {
      errors.role = 'Invalid role selected.';
    }
    setInvitationForm(prev => ({ ...prev, validationErrors: errors }));
    return Object.keys(errors).length === 0;
  };

  const queryClient = useQueryClient();

  const inviteMutation = useMutation(
    (payload: { workspace_id: number; email: string; role: 'admin' | 'member' }) =>
      inviteMember(payload, auth.token),
    {
      onSuccess: (newMember) => {
        if (selectedWorkspaceId === null) return;
        // Refresh members list
        queryClient.invalidateQueries(['workspace_members', selectedWorkspaceId]);
        setMembers(prev => [...prev, newMember]);
        setInvitationForm({ email: '', role: 'member', validationErrors: {} });
        setErrorMessage(null);
      },
      onError: (error) => {
        const axiosErr = error as AxiosError;
        setErrorMessage(
          axiosErr.response?.data?.error || 'Failed to send invitation. Please try again.'
        );
      }
    }
  );

  const handleInviteSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!validateInvitationForm()) return;
    if (selectedWorkspaceId === null) {
      setErrorMessage('Please select a workspace first.');
      return;
    }
    setIsInviting(true);
    inviteMutation.mutate({
      workspace_id: selectedWorkspaceId,
      email: invitationForm.email.trim(),
      role: invitationForm.role,
    }, { onSettled: () => setIsInviting(false) });
  };

  // Change member role mutation
  const changeMemberRoleMutation = useMutation(
    (payload: { workspace_id: number; user_id: string; role: 'owner' | 'admin' | 'member' }) =>
      changeMemberRole(payload, auth.token),
    {
      onSuccess: (updatedMember) => {
        setMembers(prev => prev.map(m => (m.user_id === updatedMember.user_id ? updatedMember : m)));
        setErrorMessage(null);
      },
      onError: (error) => {
        const axiosErr = error as AxiosError;
        setErrorMessage(axiosErr.response?.data?.error || 'Error changing role.');
      },
    }
  );

  const handleRoleChange = (user_id: string, newRole: 'owner' | 'admin' | 'member') => {
    if (selectedWorkspaceId === null) return;
    setErrorMessage(null);
    changeMemberRoleMutation.mutate({ workspace_id: selectedWorkspaceId, user_id, role: newRole });
  };

  // Remove member mutation
  const removeMemberMutation = useMutation(
    (payload: { workspace_id: number; user_id: string }) => removeMember(payload, auth.token),
    {
      onSuccess: () => {
        if (selectedWorkspaceId === null) return;
        setMembers(prev => prev.filter(m => m.user_id !== removeMemberMutation.variables?.user_id));
        setErrorMessage(null);
      },
      onError: (error) => {
        const axiosErr = error as AxiosError;
        setErrorMessage(axiosErr.response?.data?.error || 'Error removing member.');
      }
    }
  );

  const handleRemoveMember = (user_id: string) => {
    if (!window.confirm('Are you sure you want to remove this member?')) {
      return;
    }
    if (selectedWorkspaceId === null) return;
    removeMemberMutation.mutate({ workspace_id: selectedWorkspaceId, user_id });
  };

  // Resend invitation mutation
  const resendInvitationMutation = useMutation(
    (payload: { workspace_id: number; user_id: string }) => resendInvitation(payload, auth.token),
    {
      onSuccess: () => {
        setErrorMessage(null);
        alert('Invitation resent successfully');
      },
      onError: (error) => {
        const axiosErr = error as AxiosError;
        setErrorMessage(axiosErr.response?.data?.error || 'Error resending invitation.');
      }
    }
  );

  const handleResendInvitation = (user_id: string) => {
    if (selectedWorkspaceId === null) return;
    resendInvitationMutation.mutate({ workspace_id: selectedWorkspaceId, user_id });
  };

  // Workspace list filtering owners/admins only (per spec)
  const adminWorkspaces = globalWorkspaces.filter(w => w.role === 'owner' || w.role === 'admin');

  // Role options for setting
  const roleOptionsOwnerAdminMember: ('owner' | 'admin' | 'member')[] = ['owner', 'admin', 'member'];
  const roleOptionsAdminMember: ('admin' | 'member')[] = ['admin', 'member']; // For invite form

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-semibold mb-6">Team Workspace and Member Administration</h1>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">My Workspaces</h2>
          {adminWorkspaces.length === 0 ? (
            <p className="text-gray-600">You have no team workspaces to manage.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {adminWorkspaces.map(ws => (
                <button
                  key={ws.workspace_id}
                  type="button"
                  onClick={() => handleSelectWorkspace(ws.workspace_id)}
                  className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                    selectedWorkspaceId === ws.workspace_id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-400 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {ws.workspace_name}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="mb-12 max-w-md border rounded-md p-4 bg-white dark:bg-gray-800 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Create New Workspace</h2>
          <form onSubmit={handleWorkspaceCreateSubmit} noValidate>
            <div className="mb-4">
              <label htmlFor="workspace_name" className="block mb-1 font-medium">
                Workspace Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="workspace_name"
                name="workspace_name"
                value={workspaceCreateForm.workspace_name}
                onChange={onWorkspaceCreateInputChange}
                className={`w-full px-3 py-2 border rounded-md outline-none ${
                  workspaceCreateForm.validationErrors.workspace_name
                    ? 'border-red-500 focus:ring-2 focus:ring-red-400'
                    : 'border-gray-300 focus:ring-2 focus:ring-indigo-500'
                } bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
                disabled={isCreatingWorkspace}
              />
              {workspaceCreateForm.validationErrors.workspace_name && (
                <p className="mt-1 text-sm text-red-600">{workspaceCreateForm.validationErrors.workspace_name}</p>
              )}
            </div>
            <div className="mb-4">
              <label htmlFor="description" className="block mb-1 font-medium">
                Description (optional)
              </label>
              <textarea
                id="description"
                name="description"
                value={workspaceCreateForm.description}
                onChange={onWorkspaceCreateInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                rows={3}
                disabled={isCreatingWorkspace}
              />
            </div>
            <button
              type="submit"
              disabled={isCreatingWorkspace}
              className="inline-flex items-center justify-center px-5 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {isCreatingWorkspace ? 'Creating...' : 'Create Workspace'}
            </button>
            {workspaceCreateSuccess && (
              <p className="mt-2 text-green-600 font-medium">{workspaceCreateSuccess}</p>
            )}
          </form>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Workspace Members</h2>
          {selectedWorkspaceId === null ? (
            <p className="text-gray-600 dark:text-gray-400">Select a workspace above to manage its members and invitations.</p>
          ) : (
            <>
              {loadingMembers ? (
                <p className="text-gray-600 dark:text-gray-400">Loading members...</p>
              ) : errorMessage ? (
                <p className="text-red-600 font-medium">{errorMessage}</p>
              ) : members.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No members or invitations found in this workspace.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border border-gray-300 dark:border-gray-600">
                  <table className="min-w-full table-auto text-sm text-left text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Name</th>
                        <th className="px-4 py-2 font-semibold">Email</th>
                        <th className="px-4 py-2 font-semibold">Role</th>
                        <th className="px-4 py-2 font-semibold">Status</th>
                        <th className="px-4 py-2 font-semibold">Invited At</th>
                        <th className="px-4 py-2 font-semibold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map(member => (
                        <tr key={member.user_id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-2 align-middle">{member.full_name ?? <span className="italic text-gray-500">No name</span>}</td>
                          <td className="px-4 py-2 align-middle">{member.email}</td>
                          <td className="px-4 py-2 align-middle">
                            {(member.invitation_status === 'accepted') ? (
                              <select
                                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 py-1 px-2 text-sm"
                                value={member.role}
                                onChange={e => {
                                  const newRole = e.target.value as 'owner'|'admin'|'member';
                                  if (newRole !== member.role) {
                                    handleRoleChange(member.user_id, newRole);
                                  }
                                }}
                              >
                                {roleOptionsOwnerAdminMember.map(roleOpt => (
                                  <option key={roleOpt} value={roleOpt}>{roleOpt.charAt(0).toUpperCase() + roleOpt.slice(1)}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="italic text-gray-500">{member.role.charAt(0).toUpperCase() + member.role.slice(1)}</span>
                            )}
                          </td>
                          <td className="px-4 py-2 align-middle capitalize">{member.invitation_status}</td>
                          <td className="px-4 py-2 align-middle">
                            {member.invited_at ? new Date(member.invited_at).toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-2 align-middle text-center space-x-2">
                            {member.invitation_status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => handleResendInvitation(member.user_id)}
                                title="Resend Invitation"
                                disabled={resendInvitationMutation.isLoading}
                                className="text-blue-600 hover:underline disabled:text-blue-300"
                              >
                                Resend
                              </button>
                            )}
                            {member.role !== 'owner' && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(member.user_id)}
                                title="Remove Member"
                                disabled={removeMemberMutation.isLoading}
                                className="text-red-600 hover:underline disabled:text-red-300"
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-8 max-w-md border rounded-md p-4 bg-white dark:bg-gray-800 shadow-sm">
                <h3 className="text-lg font-semibold mb-3">Invite New Member</h3>
                <form onSubmit={handleInviteSubmit} noValidate>
                  <div className="mb-4">
                    <label htmlFor="email" className="block mb-1 font-medium">
                      Email <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      autoComplete="email"
                      value={invitationForm.email}
                      onChange={onInvitationInputChange}
                      className={`w-full px-3 py-2 border rounded-md outline-none ${
                        invitationForm.validationErrors.email
                          ? 'border-red-500 focus:ring-2 focus:ring-red-400'
                          : 'border-gray-300 focus:ring-2 focus:ring-indigo-500'
                      } bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
                      disabled={isInviting}
                    />
                    {invitationForm.validationErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{invitationForm.validationErrors.email}</p>
                    )}
                  </div>
                  <div className="mb-4">
                    <label htmlFor="role" className="block mb-1 font-medium">
                      Role <span className="text-red-600">*</span>
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={invitationForm.role}
                      onChange={onInvitationInputChange}
                      className={`w-full px-3 py-2 border rounded-md outline-none ${
                        invitationForm.validationErrors.role
                          ? 'border-red-500 focus:ring-2 focus:ring-red-400'
                          : 'border-gray-300 focus:ring-2 focus:ring-indigo-500'
                      } bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
                      disabled={isInviting}
                    >
                      {roleOptionsAdminMember.map(roleOpt => (
                        <option key={roleOpt} value={roleOpt}>{roleOpt.charAt(0).toUpperCase() + roleOpt.slice(1)}</option>
                      ))}
                    </select>
                    {invitationForm.validationErrors.role && (
                      <p className="mt-1 text-sm text-red-600">{invitationForm.validationErrors.role}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="inline-flex items-center justify-center px-5 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {isInviting ? 'Inviting...' : 'Send Invitation'}
                  </button>
                  {errorMessage && (
                    <p className="mt-3 text-red-600 font-medium">{errorMessage}</p>
                  )}
                </form>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
};

export default UV_TeamWorkspaceManagement;