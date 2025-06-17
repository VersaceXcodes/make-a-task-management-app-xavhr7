import { configureStore } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthState {
  token: string;
  is_authenticated: boolean;
  user_id: string;
}

export interface UserProfile {
  user_id: string;
  email: string;
  full_name: string | null;
}

export interface UserSetting {
  dark_mode_enabled: boolean;
  timezone_offset: number;
  notif_in_app_enabled: boolean;
  notif_push_enabled: boolean;
}

export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface Workspace {
  workspace_id: number;
  workspace_name: string;
  role: WorkspaceRole;
  is_personal: boolean;
}

export interface TaskList {
  task_list_id: number;
  list_name: string;
  workspace_id: number | null;
  user_id: string | null;
  position_order: number;
  incomplete_task_count: number;
}

export interface Tag {
  tag_id: number;
  tag_name: string;
  workspace_id: number | null;
  user_id: string | null;
}

export interface AssignedUser {
  user_id: string;
  full_name: string | null;
  email: string;
}

export interface Task {
  task_id: number;
  task_list_id: number;
  parent_task_id: number | null;
  title: string;
  description: string | null;
  priority: 'Low' | 'Medium' | 'High';
  due_datetime: string | null;
  estimated_effort_mins: number | null;
  status: 'Pending' | 'In Progress' | 'Completed';
  created_by_user_id: string;
  created_at: string;
  updated_at: string | null;
  is_completed: boolean;
  position_order: number;
  is_active: boolean;
  recurring_pattern: string | null;
  recurrence_end_date: string | null;
  recurrence_count: number | null;
  tags: { tag_id: number; tag_name: string }[];
  assigned_users: AssignedUser[];
}

export interface Comment {
  comment_id: number;
  task_id: number;
  user_id: string;
  parent_comment_id: number | null;
  content: string;
  created_at: string;
  updated_at: string | null;
  is_deleted: boolean;
}

export interface ActivityLog {
  activity_id: number;
  workspace_id: number | null;
  task_id: number | null;
  user_id: string;
  activity_type: string;
  details: object | null;
  created_at: string;
}

export type NotificationType =
  | 'reminder'
  | 'assignment'
  | 'comment'
  | 'status_change';

export interface Notification {
  notification_id: number;
  user_id: string;
  related_task_id: number | null;
  notification_type: NotificationType;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface UndoEntry {
  undo_id: number;
  entity_type: 'task' | 'task_assignment' | 'task_list' | 'comment' | 'tag';
  entity_id: string | number;
  created_at: string;
}

export interface LastUndoAction {
  last_action: UndoEntry | null;
}

export interface CurrentContext {
  workspace_id: number | null;
  task_list_id: number | null;
  multi_select_active: boolean;
}

interface AppState {
  // State slices
  auth: AuthState;
  user_profile: UserProfile;
  user_setting: UserSetting;
  workspaces: Workspace[];
  task_lists: TaskList[];
  current_context: CurrentContext;
  tasks: Record<number, Task>;
  selected_tasks: number[];
  tags: Tag[];
  assigned_users: AssignedUser[];
  comments: Record<number, Comment>;
  activity_logs: ActivityLog[];
  notifications: Notification[];
  unread_count: number;
  undo: LastUndoAction;

  // Setters: These setters replace the slice entirely or update fields for objects
  set_auth: (auth: Partial<AuthState>) => void;
  set_user_profile: (profile: Partial<UserProfile>) => void;
  set_user_setting: (setting: Partial<UserSetting>) => void;
  set_workspaces: (workspaces: Workspace[]) => void;
  set_task_lists: (lists: TaskList[]) => void;
  set_current_context: (ctx: Partial<CurrentContext>) => void;
  set_tasks: (tasks: Record<number, Task>) => void;
  set_selected_tasks: (selected: number[]) => void;
  set_tags: (tags: Tag[]) => void;
  set_assigned_users: (users: AssignedUser[]) => void;
  set_comments: (comments: Record<number, Comment>) => void;
  set_activity_logs: (logs: ActivityLog[]) => void;
  set_notifications: (notifs: Notification[]) => void;
  set_unread_count: (count: number) => void;
  set_undo: (undo: LastUndoAction) => void;

  // Socket management
  socket: Socket | null;
  setup_socket: (token: string) => void; // Initializes socket connection
  disconnect_socket: () => void;
}

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace(/^http/, 'ws')
  : 'ws://localhost:3000';

export const use_app_store = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state values for each slice
      auth: {
        token: '',
        is_authenticated: false,
        user_id: '',
      },
      user_profile: {
        user_id: '',
        email: '',
        full_name: null,
      },
      user_setting: {
        dark_mode_enabled: false,
        timezone_offset: 0,
        notif_in_app_enabled: true,
        notif_push_enabled: false,
      },
      workspaces: [],
      task_lists: [],
      current_context: {
        workspace_id: null,
        task_list_id: null,
        multi_select_active: false,
      },
      tasks: {},
      selected_tasks: [],
      tags: [],
      assigned_users: [],
      comments: {},
      activity_logs: [],
      notifications: [],
      unread_count: 0,
      undo: {
        last_action: null,
      },

      // Socket management
      socket: null,

      // Setter functions for state updates
      set_auth: (auth) =>
        set((state) => ({
          auth: { ...state.auth, ...auth },
        })),

      set_user_profile: (profile) =>
        set((state) => ({
          user_profile: { ...state.user_profile, ...profile },
        })),

      set_user_setting: (setting) =>
        set((state) => ({
          user_setting: { ...state.user_setting, ...setting },
        })),

      set_workspaces: (workspaces) => set(() => ({ workspaces })),

      set_task_lists: (lists) => set(() => ({ task_lists: lists })),

      set_current_context: (ctx) =>
        set((state) => ({
          current_context: { ...state.current_context, ...ctx },
        })),

      set_tasks: (tasks) => set(() => ({ tasks })),

      set_selected_tasks: (selected) => set(() => ({ selected_tasks: selected })),

      set_tags: (tags) => set(() => ({ tags })),

      set_assigned_users: (users) => set(() => ({ assigned_users: users })),

      set_comments: (comments) => set(() => ({ comments })),

      set_activity_logs: (logs) => set(() => ({ activity_logs: logs })),

      set_notifications: (notifs) => set(() => ({ notifications: notifs })),

      set_unread_count: (count) => set(() => ({ unread_count: count })),

      set_undo: (undo) => set(() => ({ undo })),

      // Socket setup and teardown
      setup_socket: (token) => {
        const state = get();
        if (state.socket) {
          state.socket.close();
        }

        const socket = io(SOCKET_URL, {
          auth: {
            token,
          },
        });

        socket.on('connect', () => {
          console.log('Socket connected');
        });

        socket.on('error', (error) => {
          console.error('Socket error:', error);
        });

        socket.on('task:update', (task: Task) => {
          const current = get().tasks;
          set({ tasks: { ...current, [task.task_id]: task } });
        });

        socket.on('notification:new', (notification: Notification) => {
          const current = get().notifications;
          set({
            notifications: [notification, ...current],
            unread_count: get().unread_count + 1,
          });
        });

        set({ socket });
      },

      disconnect_socket: () => {
        const socket = get().socket;
        if (socket) {
          socket.close();
          set({ socket: null });
        }
      },
    }),
    {
      name: 'task-app-store',
      // Only persist auth and settings
      partialize: (state) => ({
        auth: state.auth,
        user_setting: state.user_setting,
      }),
    }
  )
);