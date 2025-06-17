import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { use_app_store } from "@/store/main";

interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

interface AuthResponse {
  token: string;
  user_profile: {
    user_id: string;
    email: string;
    full_name: string | null;
  };
  user_setting: {
    dark_mode_enabled: boolean;
    timezone_offset: number;
    notif_in_app_enabled: boolean;
    notif_push_enabled: boolean;
  };
}

const UV_SignIn: React.FC = () => {
  const navigate = useNavigate();

  // Global setters from Zustand store
  const set_auth = use_app_store((state) => state.set_auth);
  const set_user_profile = use_app_store((state) => state.set_user_profile);
  const set_user_setting = use_app_store((state) => state.set_user_setting);
  const setup_socket = use_app_store((state) => state.setup_socket);

  // Local UI state variables
  const [email, set_email] = useState<string>("");
  const [password, set_password] = useState<string>("");
  const [remember_me, set_remember_me] = useState<boolean>(false);
  const [validation_errors, set_validation_errors] = useState<Record<string, string>>({});
  const [general_error, set_general_error] = useState<string>("");

  // Axios instance base URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  // React Query mutation for login
  const loginMutation = useMutation<AuthResponse, unknown, LoginRequest>({
    mutationFn: async (payload: LoginRequest) => {
      const response = await axios.post<AuthResponse>(`${API_BASE_URL}/auth/login`, payload);
      return response.data;
    },
    onSuccess: (data) => {
      // Update global auth and user profile state
      set_auth({
        token: data.token,
        is_authenticated: true,
        user_id: data.user_profile.user_id,
      });
      set_user_profile(data.user_profile);
      set_user_setting(data.user_setting);

      // Setup websocket socket connection
      setup_socket(data.token);

      // Redirect to dashboard
      navigate("/dashboard", { replace: true });
    },
    onError: (error) => {
      // Reset password field for security
      set_password("");

      // Handle request errors
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          set_validation_errors({ email: "Invalid email or password", password: "Invalid email or password" });
          set_general_error("");
        } else if (error.response?.data && typeof error.response.data === 'object' && 'error' in error.response.data) {
          // Error response should be object with 'error' string property
          set_general_error(error.response.data.error);
          set_validation_errors({});
        } else {
          set_general_error("Unexpected error occurred. Please try again.");
          set_validation_errors({});
        }
      } else if (error instanceof Error) {
        set_general_error(error.message ?? "Unexpected error occurred. Please try again.");
        set_validation_errors({});
      } else {
        set_general_error("Unexpected error occurred. Please try again.");
        set_validation_errors({});
      }
    },
  });

  // Form submission handler
  const submitSignInForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    set_validation_errors({});
    set_general_error("");

    const newErrors: Record<string, string> = {};
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Invalid email format";
    }
    if (!password) {
      newErrors.password = "Password is required";
    }
    if (Object.keys(newErrors).length > 0) {
      set_validation_errors(newErrors);
      return;
    }

    // Call mutation with remember_me
    loginMutation.mutate({ email: email.trim(), password, remember_me });
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Sign in to your account
          </h2>
          {general_error && (
            <div
              role="alert"
              className="rounded-md bg-red-50 p-4 text-red-700 text-sm font-medium"
              tabIndex={-1}
              aria-live="assertive"
            >
              {general_error}
            </div>
          )}
          <form className="mt-8 space-y-6" onSubmit={submitSignInForm} noValidate>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Email address
                </label>
                <input
                  id="email-address"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={loginMutation.isLoading}
                  value={email}
                  onChange={(e) => set_email(e.target.value)}
                  className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${
                    validation_errors.email
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                  } placeholder-gray-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700 focus:outline-none focus:z-10 sm:text-sm`}
                  placeholder="Email address"
                  aria-invalid={validation_errors.email ? "true" : "false"}
                  aria-describedby={validation_errors.email ? "email-error" : undefined}
                />
                {validation_errors.email && (
                  <p className="mt-1 text-sm text-red-600" id="email-error">
                    {validation_errors.email}
                  </p>
                )}
              </div>
              <div className="mt-4">
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={loginMutation.isLoading}
                  value={password}
                  onChange={(e) => set_password(e.target.value)}
                  className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${
                    validation_errors.password
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                  } placeholder-gray-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700 focus:outline-none focus:z-10 sm:text-sm`}
                  placeholder="Password"
                  aria-invalid={validation_errors.password ? "true" : "false"}
                  aria-describedby={validation_errors.password ? "password-error" : undefined}
                />
                {validation_errors.password && (
                  <p className="mt-1 text-sm text-red-600" id="password-error">
                    {validation_errors.password}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember_me"
                  name="remember_me"
                  type="checkbox"
                  checked={remember_me}
                  disabled={loginMutation.isLoading}
                  onChange={(e) => set_remember_me(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="remember_me" className="ml-2 block text-sm text-gray-900 dark:text-gray-200">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                {/* Password reset is out of scope per PRD; we can link to placeholder or dummy path */}
                <Link
                  to="/forgot-password"
                  className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loginMutation.isLoading}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                  loginMutation.isLoading
                    ? "bg-indigo-300 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                }`}
              >
                {loginMutation.isLoading && (
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8z"
                    ></path>
                  </svg>
                )}
                Sign In
              </button>
            </div>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default UV_SignIn;