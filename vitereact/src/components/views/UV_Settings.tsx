import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useAppStore } from "@/store/main";

interface UpdateSettingsPayload {
  default_view: string;
  theme: string;
  notification_settings: {
    notifications_enabled: boolean;
  };
}

interface UserSettingsResponse {
  user_uid: string;
  default_view: string;
  theme: string;
  notification_settings: {
    notifications_enabled: boolean;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

const UV_Settings: React.FC = () => {
  const navigate = useNavigate();
  // Global state access
  const auth_token = useAppStore((state) => state.auth_token);
  const ui_preferences = useAppStore((state) => state.ui_preferences);
  const update_ui_preferences = useAppStore((state) => state.update_ui_preferences);
  const clear_auth = useAppStore((state) => state.clear_auth);

  // Local state for form values initialized from global store and default values
  const [defaultView, setDefaultView] = useState<string>(ui_preferences.default_view || "kanban");
  const [theme, setTheme] = useState<string>(ui_preferences.theme || "light");
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [formChanged, setFormChanged] = useState<boolean>(false);

  // Mutation for saving settings.
  const saveSettingsMutation = useMutation<UserSettingsResponse, Error, UpdateSettingsPayload>(
    async (payload: UpdateSettingsPayload) => {
      const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/user_settings`;
      const response = await axios.put(url, payload, {
        headers: {
          Authorization: `Bearer ${auth_token}`,
        },
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        // On successful update, update global state
        update_ui_preferences({ default_view: defaultView, theme: theme });
        setFormChanged(false);
      },
      onError: (error) => {
        console.error("Error saving settings:", error);
      },
    }
  );

  // Handler for form changes: update local state and mark form as changed
  const handleDefaultViewChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setDefaultView(e.target.value);
    setFormChanged(true);
  };
  const handleThemeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.target.value);
    setFormChanged(true);
  };
  const handleNotificationsChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNotificationsEnabled(e.target.checked);
    setFormChanged(true);
  };

  // Handler for form submission: save settings through mutation.
  const handleSaveSettings = (e: FormEvent) => {
    e.preventDefault();
    const payload: UpdateSettingsPayload = {
      default_view: defaultView,
      theme: theme,
      notification_settings: {
        notifications_enabled: notificationsEnabled,
      },
    };
    saveSettingsMutation.mutate(payload);
  };

  // Handler for logout: clear global auth and navigate to login.
  const handleLogout = () => {
    clear_auth();
    navigate("/login");
  };

  return (
    <>
      <div className="max-w-2xl mx-auto p-8 bg-white shadow-md rounded">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <form onSubmit={handleSaveSettings}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="default_view">
              Default View
            </label>
            <select
              id="default_view"
              value={defaultView}
              onChange={handleDefaultViewChange}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="kanban">Kanban</option>
              <option value="list">List</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="theme">
              Theme
            </label>
            <select
              id="theme"
              value={theme}
              onChange={handleThemeChange}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className="mb-4 flex items-center">
            <input
              id="notifications_enabled"
              type="checkbox"
              checked={notificationsEnabled}
              onChange={handleNotificationsChange}
              className="mr-2"
            />
            <label htmlFor="notifications_enabled" className="text-gray-700">
              Enable In-App Notifications
            </label>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={saveSettingsMutation.isLoading || !formChanged}
              className={`px-4 py-2 rounded text-white ${
                saveSettingsMutation.isLoading || !formChanged ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saveSettingsMutation.isLoading ? "Saving..." : "Save Settings"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
            >
              Logout
            </button>
          </div>
        </form>
        {saveSettingsMutation.isError && (
          <div className="mt-4 text-red-600">
            Error saving settings. Please try again.
          </div>
        )}
        <div className="mt-6">
          <Link to="/profile" className="text-blue-600 hover:underline">
            Back to Profile
          </Link>
        </div>
      </div>
    </>
  );
};

export default UV_Settings;