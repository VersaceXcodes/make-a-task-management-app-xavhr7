import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { use_app_store } from "@/store/main";

// TypeScript interfaces for data shapes

interface UserProfile {
  user_id: string;
  email: string;
  full_name: string | null;
}

interface UserSetting {
  dark_mode_enabled: boolean;
  timezone_offset: number;
  notif_in_app_enabled: boolean;
  notif_push_enabled: boolean;
}

interface PasswordChangeForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
  validationErrors: Record<string, string>;
}

interface UserProfileUpdateRequest {
  full_name?: string | null;
  dark_mode_enabled?: boolean;
  timezone_offset?: number;
  notif_in_app_enabled?: boolean;
  notif_push_enabled?: boolean;
}

interface UserProfileAndSettingsResponse {
  user_profile: UserProfile;
  user_setting: UserSetting;
}

interface LogoutResponse {}

const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

// Utility: timezones list with offsets in minutes and labels for selection
// This list contains common timezones with offsets in minutes relative to UTC.
// For simplicity and MVP, only a subset is included.
const timezones = [
  { offset: -720, label: "(UTC-12:00) Baker Island" },
  { offset: -660, label: "(UTC-11:00) Niue, Samoa" },
  { offset: -600, label: "(UTC-10:00) Hawaii-Aleutian" },
  { offset: -570, label: "(UTC-09:30) Marquesas Islands" },
  { offset: -540, label: "(UTC-09:00) Alaska" },
  { offset: -480, label: "(UTC-08:00) Pacific Time (US & Canada)" },
  { offset: -420, label: "(UTC-07:00) Mountain Time (US & Canada)" },
  { offset: -360, label: "(UTC-06:00) Central Time (US & Canada)" },
  { offset: -300, label: "(UTC-05:00) Eastern Time (US & Canada)" },
  { offset: -240, label: "(UTC-04:00) Atlantic Time (Canada)" },
  { offset: -210, label: "(UTC-03:30) Newfoundland" },
  { offset: -180, label: "(UTC-03:00) Brazil, Buenos Aires" },
  { offset: -120, label: "(UTC-02:00) South Georgia/Sandwich Islands" },
  { offset: -60, label: "(UTC-01:00) Azores" },
  { offset: 0, label: "(UTC+00:00) Greenwich Mean Time, London" },
  { offset: 60, label: "(UTC+01:00) Amsterdam, Berlin, Rome" },
  { offset: 120, label: "(UTC+02:00) Athens, Cairo, Jerusalem" },
  { offset: 180, label: "(UTC+03:00) Moscow, Nairobi" },
  { offset: 210, label: "(UTC+03:30) Tehran" },
  { offset: 240, label: "(UTC+04:00) Dubai, Baku" },
  { offset: 270, label: "(UTC+04:30) Kabul" },
  { offset: 300, label: "(UTC+05:00) Islamabad, Karachi" },
  { offset: 330, label: "(UTC+05:30) India Standard Time" },
  { offset: 345, label: "(UTC+05:45) Nepal" },
  { offset: 360, label: "(UTC+06:00) Almaty, Dhaka" },
  { offset: 390, label: "(UTC+06:30) Cocos Islands, Myanmar" },
  { offset: 420, label: "(UTC+07:00) Bangkok, Jakarta" },
  { offset: 480, label: "(UTC+08:00) Beijing, Singapore" },
  { offset: 525, label: "(UTC+08:45) Southeastern Western Australia" },
  { offset: 540, label: "(UTC+09:00) Tokyo, Seoul" },
  { offset: 570, label: "(UTC+09:30) Adelaide, Darwin" },
  { offset: 600, label: "(UTC+10:00) Sydney, Guam" },
  { offset: 630, label: "(UTC+10:30) Lord Howe Island" },
  { offset: 660, label: "(UTC+11:00) Magadan, New Caledonia" },
  { offset: 720, label: "(UTC+12:00) Auckland, Fiji" },
  { offset: 765, label: "(UTC+12:45) Chatham Islands" },
  { offset: 780, label: "(UTC+13:00) Samoa" },
  { offset: 840, label: "(UTC+14:00) Line Islands" },
];

// Helper: Validate password strength (8+ chars, uppercase, lowercase, digit, special char)
const validatePasswordStrength = (password: string): string | null => {
  if (password.length < 8) return "Password must be at least 8 characters long.";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include a digit.";
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
    return "Password must include a special character.";
  return null;
};

// Component

const UV_UserProfileSettings: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Global state slices and setters from Zustand
  const userProfile = use_app_store((state) => state.user_profile ?? null);
  const set_user_profile = use_app_store((state) => state.set_user_profile);
  const userSettings = use_app_store((state) => state.user_setting ?? {
    dark_mode_enabled: false,
    timezone_offset: 0,
    notif_in_app_enabled: true,
    notif_push_enabled: true,
  });
  const set_user_setting = use_app_store((state) => state.set_user_setting);
  const set_auth = use_app_store((state) => state.set_auth);

  // Local editable state for profile full_name - start from global state
  const [localFullName, setLocalFullName] = useState<string>(userProfile?.full_name ?? "");

  // Local editable state for preferences - initialized from global state on mount/update
  const [localSettings, setLocalSettings] = useState<UserSetting>(userSettings);

  // Track if edits were made to user profile or settings
  const [profileEdited, setProfileEdited] = useState(false);
  const [settingsEdited, setSettingsEdited] = useState(false);

  // Password change form state
  const [passwordForm, setPasswordForm] = useState<PasswordChangeForm>({
    current_password: "",
    new_password: "",
    confirm_password: "",
    validationErrors: {},
  });

  // Submission and feedback states
  const [profileSaveMessage, setProfileSaveMessage] = useState<string | null>(null);
  const [settingsSaveMessage, setSettingsSaveMessage] = useState<string | null>(null);
  const [passwordChangeMessage, setPasswordChangeMessage] = useState<string | null>(null);

  // Error boundary fallback state
  const [hasError, setHasError] = useState(false);

  // Refetch profile & settings API implementation
  const fetchUserProfileAndSettings = async (): Promise<UserProfileAndSettingsResponse> => {
    const response = await axios.get<UserProfileAndSettingsResponse>(
      `${VITE_API_BASE_URL}/user/profile`,
      { withCredentials: true }
    );
    return response.data;
  };

  // react-query to fetch initial data (on mount)
  const profileQuery = useQuery<UserProfileAndSettingsResponse, Error>(
    ["userProfileAndSettings"],
    fetchUserProfileAndSettings,
    {
      onSuccess: (data) => {
        // Update global states and local state
        set_user_profile(data.user_profile);
        set_user_setting(data.user_setting);
        setLocalFullName(data.user_profile.full_name ?? "");
        setLocalSettings(data.user_setting);
        setProfileEdited(false);
        setSettingsEdited(false);
      },
      onError: () => {
        // Handling errors if needed (e.g., show message)
        setHasError(true);
      },
    }
  );

  // Update profile and settings mutation
  const updateUserProfileAndSettingsMutation = useMutation<
    UserProfileAndSettingsResponse,
    Error,
    UserProfileUpdateRequest
  >(
    async (updates) => {
      const response = await axios.put<UserProfileAndSettingsResponse>(
        `${VITE_API_BASE_URL}/user/profile`,
        updates,
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
    {
      onSuccess: (data) => {
        set_user_profile(data.user_profile);
        set_user_setting(data.user_setting);
        setLocalFullName(data.user_profile.full_name ?? "");
        setLocalSettings(data.user_setting);
        setProfileEdited(false);
        setSettingsEdited(false);
        setProfileSaveMessage("Profile and preferences saved successfully.");
        setTimeout(() => setProfileSaveMessage(null), 4000);
      },
      onError: (e) => {
        setProfileSaveMessage("Failed to save profile/preferences: " + e.message);
        setTimeout(() => setProfileSaveMessage(null), 6000);
      },
    }
  );

  // Logout mutation
  const logoutMutation = useMutation<LogoutResponse, Error, void>(
    async () => {
      await axios.post(
        `${VITE_API_BASE_URL}/auth/logout`,
        {},
        {
          withCredentials: true,
        }
      );
    },
    {
      onSuccess: () => {
        set_auth({ token: "", is_authenticated: false, user_id: "" });
        // Clear user profile and settings global state on logout correctly
        set_user_profile(null);
        set_user_setting({
          dark_mode_enabled: false,
          timezone_offset: 0,
          notif_in_app_enabled: true,
          notif_push_enabled: true,
        });
        navigate("/");
      },
      onError: () => {
        alert("Logout failed. Please try again.");
      },
    }
  );

  // Effect: sync global userProfile.full_name changes to local input with safe null check
  useEffect(() => {
    setLocalFullName(userProfile?.full_name ?? "");
  }, [userProfile?.full_name]);

  // Effect: sync global userSettings to local state with safe null check
  useEffect(() => {
    if (userSettings) setLocalSettings(userSettings);
  }, [userSettings]);

  // Handlers for profile input
  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalFullName(e.target.value);
    setProfileEdited(e.target.value !== (userProfile?.full_name ?? ""));
  };

  // Handlers for preference toggles and select
  const handleToggleDarkMode = () => {
    const newVal = !localSettings.dark_mode_enabled;
    setLocalSettings((s) => ({ ...s, dark_mode_enabled: newVal }));
    setSettingsEdited(true);
  };
  const handleToggleInAppNotif = () => {
    const newVal = !localSettings.notif_in_app_enabled;
    setLocalSettings((s) => ({ ...s, notif_in_app_enabled: newVal }));
    setSettingsEdited(true);
  };
  const handleTogglePushNotif = () => {
    const newVal = !localSettings.notif_push_enabled;
    setLocalSettings((s) => ({ ...s, notif_push_enabled: newVal }));
    setSettingsEdited(true);
  };
  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newOffset = parseInt(e.target.value, 10);
    if (!isNaN(newOffset)) {
      setLocalSettings((s) => ({ ...s, timezone_offset: newOffset }));
      setSettingsEdited(true);
    }
  };

  // Save handler - submit updates to backend (profile + preferences if edited)
  const handleSaveProfileAndSettings = () => {
    const updatePayload: UserProfileUpdateRequest = {};
    if (profileEdited) updatePayload.full_name = localFullName;
    if (settingsEdited) {
      updatePayload.dark_mode_enabled = localSettings.dark_mode_enabled;
      updatePayload.timezone_offset = localSettings.timezone_offset;
      updatePayload.notif_in_app_enabled = localSettings.notif_in_app_enabled;
      updatePayload.notif_push_enabled = localSettings.notif_push_enabled;
    }
    if (Object.keys(updatePayload).length === 0) return;
    updateUserProfileAndSettingsMutation.mutate(updatePayload);
  };

  // Password change handlers

  // Memoized validatePasswordChange outside component scope to avoid recreation
  const validatePasswordChange = useCallback(() => {
    const errors: Record<string, string> = {};
    if (!passwordForm.current_password) {
      errors.current_password = "Current password is required.";
    }
    if (!passwordForm.new_password) {
      errors.new_password = "New password is required.";
    } else {
      const strengthError = validatePasswordStrength(passwordForm.new_password);
      if (strengthError) errors.new_password = strengthError;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      errors.confirm_password = "Confirm password does not match new password.";
    }
    return errors;
  }, [passwordForm.current_password, passwordForm.new_password, passwordForm.confirm_password]);

  useEffect(() => {
    const errors = validatePasswordChange();
    setPasswordForm((form) => ({ ...form, validationErrors: errors }));
  }, [passwordForm.current_password, passwordForm.new_password, passwordForm.confirm_password, validatePasswordChange]);

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((form) => ({ ...form, [name]: value }));
  };

  // Implement password change submission to backend for future extension
  // Note: The backend API for password change was not specified, so implement simulation with clear comment
  const handleSubmitPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validatePasswordChange();
    setPasswordForm((form) => ({ ...form, validationErrors: errors }));
    if (Object.keys(errors).length > 0) return;

    // TODO: Implement backend password change API call when available
    setPasswordChangeMessage("Password change is not implemented on backend yet.");

    // Clear form securely
    setPasswordForm({
      current_password: "",
      new_password: "",
      confirm_password: "",
      validationErrors: {},
    });
    setTimeout(() => setPasswordChangeMessage(null), 5000);
  };

  // Logout handler
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (hasError) {
    return (
      <>
        <div className="max-w-4xl mx-auto p-6 text-center text-red-600">
          <h1 className="text-2xl font-semibold mb-4">Error loading profile</h1>
          <p>Something went wrong while loading your profile settings.</p>
          <button
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => {
              setHasError(false);
              profileQuery.refetch();
            }}
          >
            Retry
          </button>
        </div>
      </>
    );
  }

  if (profileQuery.isLoading) {
    return (
      <>
        <div className="max-w-4xl mx-auto p-6 text-center text-gray-600">
          <p>Loading your profile and settings...</p>
        </div>
      </>
    );
  }

  if (profileQuery.isError) {
    return (
      <>
        <div className="max-w-4xl mx-auto p-6 text-center text-red-600">
          <p>Error fetching profile: {profileQuery.error?.message}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto p-6 space-y-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          User Profile and Preferences
        </h1>

        {/* Profile Section */}
        <section className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Profile Information
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveProfileAndSettings();
            }}
            className="space-y-6"
            aria-label="User profile form"
          >
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email (readonly)
              </label>
              {/* Changed from input to div for better accessibility */}
              <div
                id="email"
                className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-100 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 select-none"
                aria-readonly="true"
                tabIndex={-1}
              >
                {userProfile?.email ?? ""}
              </div>
            </div>
            <div>
              <label
                htmlFor="full_name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Full Name (optional)
              </label>
              <input
                id="full_name"
                type="text"
                value={localFullName}
                onChange={handleFullNameChange}
                placeholder="Enter your full name"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* Save Profile Button */}
            <div>
              <button
                type="submit"
                disabled={!profileEdited && !settingsEdited || updateUserProfileAndSettingsMutation.isLoading}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md  text-white ${
                  (profileEdited || settingsEdited) && !updateUserProfileAndSettingsMutation.isLoading
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-400 cursor-not-allowed"
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition`}
              >
                {updateUserProfileAndSettingsMutation.isLoading ? "Saving..." : "Save Changes"}
              </button>
              {profileSaveMessage && (
                <p
                  role="alert"
                  className={`mt-2 text-sm ${
                    profileSaveMessage.toLowerCase().includes("fail")
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {profileSaveMessage}
                </p>
              )}
            </div>
          </form>
        </section>

        {/* Preferences Section */}
        <section className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Preferences
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveProfileAndSettings();
            }}
            aria-label="User preferences form"
            className="space-y-6"
          >
            <div className="flex items-center">
              <input
                id="dark_mode_enabled"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={localSettings.dark_mode_enabled}
                onChange={handleToggleDarkMode}
              />
              <label
                htmlFor="dark_mode_enabled"
                className="ml-3 block text-sm text-gray-700 dark:text-gray-300"
              >
                Enable Dark Mode
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="notif_in_app_enabled"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={localSettings.notif_in_app_enabled}
                onChange={handleToggleInAppNotif}
              />
              <label
                htmlFor="notif_in_app_enabled"
                className="ml-3 block text-sm text-gray-700 dark:text-gray-300"
              >
                Enable In-App Notifications
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="notif_push_enabled"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={localSettings.notif_push_enabled}
                onChange={handleTogglePushNotif}
              />
              <label
                htmlFor="notif_push_enabled"
                className="ml-3 block text-sm text-gray-700 dark:text-gray-300"
              >
                Enable Push Notifications
              </label>
            </div>

            <div>
              <label
                htmlFor="timezone_offset"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Select Timezone
              </label>
              <select
                id="timezone_offset"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={localSettings.timezone_offset}
                onChange={handleTimezoneChange}
              >
                {timezones.map((tz) => (
                  <option key={tz.offset} value={tz.offset}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
            {/* Save Preferences Button */}
            <div>
              <button
                type="submit"
                disabled={!settingsEdited && !profileEdited || updateUserProfileAndSettingsMutation.isLoading}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md  text-white ${
                  (settingsEdited || profileEdited) && !updateUserProfileAndSettingsMutation.isLoading
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-400 cursor-not-allowed"
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition`}
              >
                {updateUserProfileAndSettingsMutation.isLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </section>

        {/* Password Change Section */}
        <section className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Change Password
          </h2>
          <form onSubmit={handleSubmitPasswordChange} noValidate aria-label="Change password form" className="space-y-6">
            <div>
              <label
                htmlFor="current_password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Current Password
              </label>
              <input
                id="current_password"
                name="current_password"
                type="password"
                autoComplete="current-password"
                value={passwordForm.current_password}
                onChange={handlePasswordInputChange}
                className={`mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 ${
                  passwordForm.validationErrors.current_password
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                } dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600`}
                aria-invalid={Boolean(passwordForm.validationErrors.current_password)}
                aria-describedby="current_password_error"
              />
              {passwordForm.validationErrors.current_password && (
                <p
                  className="mt-1 text-sm text-red-600"
                  id="current_password_error"
                  role="alert"
                >
                  {passwordForm.validationErrors.current_password}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="new_password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                New Password
              </label>
              <input
                id="new_password"
                name="new_password"
                type="password"
                autoComplete="new-password"
                value={passwordForm.new_password}
                onChange={handlePasswordInputChange}
                className={`mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 ${
                  passwordForm.validationErrors.new_password
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                } dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600`}
                aria-invalid={Boolean(passwordForm.validationErrors.new_password)}
                aria-describedby="new_password_error"
              />
              {passwordForm.validationErrors.new_password && (
                <p className="mt-1 text-sm text-red-600" id="new_password_error" role="alert">
                  {passwordForm.validationErrors.new_password}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="confirm_password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Confirm New Password
              </label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                value={passwordForm.confirm_password}
                onChange={handlePasswordInputChange}
                className={`mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 ${
                  passwordForm.validationErrors.confirm_password
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                } dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600`}
                aria-invalid={Boolean(passwordForm.validationErrors.confirm_password)}
                aria-describedby="confirm_password_error"
              />
              {passwordForm.validationErrors.confirm_password && (
                <p className="mt-1 text-sm text-red-600" id="confirm_password_error" role="alert">
                  {passwordForm.validationErrors.confirm_password}
                </p>
              )}
            </div>
            <div>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 text-white transition"
              >
                Change Password
              </button>
            </div>
            {passwordChangeMessage && (
              <p className="text-sm text-yellow-500" role="alert">{passwordChangeMessage}</p>
            )}
          </form>
        </section>

        {/* Logout Section */}
        <section className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center">
          <button
            onClick={handleLogout}
            disabled={logoutMutation.isLoading}
            className="inline-flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition"
          >
            {logoutMutation.isLoading ? "Logging out..." : "Log Out"}
          </button>
        </section>
      </div>
    </>
  );
};

export default UV_UserProfileSettings;