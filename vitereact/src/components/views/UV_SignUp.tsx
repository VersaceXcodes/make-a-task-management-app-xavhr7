import React, { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { use_app_store } from "@/store/main";

interface SignupRequest {
  email: string;
  password: string;
  full_name?: string;
}

interface UserProfile {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at?: string;
  updated_at?: string | null;
}

interface UserSetting {
  dark_mode_enabled: boolean;
  timezone_offset: number;
  notif_in_app_enabled: boolean;
  notif_push_enabled: boolean;
}

interface AuthResponse {
  token: string;
  user_profile: UserProfile;
  user_setting: UserSetting;
}

interface ValidationErrors {
  [field: string]: string;
}

const api_base_url = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const UV_SignUp: React.FC = () => {
  const navigate = useNavigate();

  // Access the global auth state setter
  const set_auth = use_app_store((state) => state.set_auth);
  const set_user_profile = use_app_store((state) => state.set_user_profile);
  const set_user_setting = use_app_store((state) => state.set_user_setting);

  // Form fields state
  const [email, set_email] = useState<string>("");
  const [password, set_password] = useState<string>("");
  const [passwordConfirmation, set_password_confirmation] = useState<string>("");
  const [rememberMe, set_remember_me] = useState<boolean>(false);

  // Validation errors keyed by field name
  const [validationErrors, set_validation_errors] = useState<ValidationErrors>({});

  // Client-side validation function
  function validateInputs(): boolean {
    const errors: ValidationErrors = {};

    // Basic email regex check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!emailRegex.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (!passwordConfirmation) {
      errors.passwordConfirmation = "Please confirm your password";
    } else if (password !== passwordConfirmation) {
      errors.passwordConfirmation = "Passwords do not match";
    }

    set_validation_errors(errors);
    return Object.keys(errors).length === 0;
  }

  // Mutation for signup API call
  const signupMutation = useMutation<AuthResponse, AxiosError, SignupRequest>({
    mutationFn: async (newUserData) => {
      // Construct payload with required fields only
      const payload: SignupRequest = {
        email: newUserData.email,
        password: newUserData.password
      };
      const response = await axios.post<AuthResponse>(
        `${api_base_url}/auth/signup`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Update global auth state and user info
      set_auth({ token: data.token, is_authenticated: true, user_id: data.user_profile.user_id, rememberMe });
      set_user_profile(data.user_profile);
      set_user_setting(data.user_setting);
      // Redirect to onboarding tour
      navigate("/onboarding", { replace: true });
    },
    onError: (error) => {
      // Handle server validation errors or general errors
      if (error.response?.status === 400 && error.response.data) {
        // Attempt to parse possible validation error structure
        const errData = error.response.data;
        if (typeof errData === "object" && "error" in errData && typeof errData.error === "string") {
          set_validation_errors({ email: errData.error });
        } else if (typeof errData === "object") {
          // Assume errData might contain field-specific errors
          const newErrors: ValidationErrors = {};
          Object.entries(errData).forEach(([key, value]) => {
            if (typeof value === "string") {
              newErrors[key] = value;
            }
          });
          if (Object.keys(newErrors).length > 0) {
            set_validation_errors(newErrors);
          } else {
            set_validation_errors({ general: "Unexpected validation error. Please check your input." });
          }
        } else {
          set_validation_errors({ general: "Unexpected validation error. Please try again." });
        }
      } else {
        set_validation_errors({ general: "Unexpected error occurred. Please try again." });
      }
    },
  });

  // Handle form submission event
  const submitSignUpForm = (e: FormEvent) => {
    e.preventDefault();

    // Clear general errors
    set_validation_errors((prev) => {
      const copy = { ...prev };
      delete copy.general;
      return copy;
    });
    if (!validateInputs()) return;
    signupMutation.mutate({ email: email.trim(), password });
  };

  return (
    <>
      <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Create your TaskCraft account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300 max-w">
            Or{" "}
            <Link
              to="/signin"
              className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 py-8 px-6 shadow rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={submitSignUpForm} noValidate>
              {/* Email field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => set_email(e.target.value)}
                    className={`appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-900 dark:text-gray-100 ${
                      validationErrors.email ? "border-red-500" : ""
                    }`}
                    aria-invalid={validationErrors.email ? "true" : "false"}
                    aria-describedby={validationErrors.email ? "email-error" : undefined}
                  />
                </div>
                {validationErrors.email && (
                  <p
                    className="mt-2 text-sm text-red-600 dark:text-red-400"
                    id="email-error"
                    role="alert"
                    aria-live="polite"
                  >
                    {validationErrors.email}
                  </p>
                )}
              </div>

              {/* Password field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => set_password(e.target.value)}
                    className={`appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-900 dark:text-gray-100 ${
                      validationErrors.password ? "border-red-500" : ""
                    }`}
                    aria-invalid={validationErrors.password ? "true" : "false"}
                    aria-describedby={validationErrors.password ? "password-error" : undefined}
                  />
                </div>
                {validationErrors.password && (
                  <p
                    className="mt-2 text-sm text-red-600 dark:text-red-400"
                    id="password-error"
                    role="alert"
                    aria-live="polite"
                  >
                    {validationErrors.password}
                  </p>
                )}
              </div>

              {/* Password confirmation field */}
              <div>
                <label
                  htmlFor="password-confirmation"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Confirm Password
                </label>
                <div className="mt-1">
                  <input
                    id="password-confirmation"
                    name="passwordConfirmation"
                    type="password"
                    autoComplete="new-password"
                    value={passwordConfirmation}
                    onChange={(e) => set_password_confirmation(e.target.value)}
                    className={`appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-900 dark:text-gray-100 ${
                      validationErrors.passwordConfirmation ? "border-red-500" : ""
                    }`}
                    aria-invalid={validationErrors.passwordConfirmation ? "true" : "false"}
                    aria-describedby={validationErrors.passwordConfirmation ? "password-confirmation-error" : undefined}
                  />
                </div>
                {validationErrors.passwordConfirmation && (
                  <p
                    className="mt-2 text-sm text-red-600 dark:text-red-400"
                    id="password-confirmation-error"
                    role="alert"
                    aria-live="polite"
                  >
                    {validationErrors.passwordConfirmation}
                  </p>
                )}
              </div>

              {/* Remember me checkbox */}
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => set_remember_me(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  disabled={signupMutation.isLoading}
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-900 dark:text-gray-300 select-none"
                >
                  Remember me
                </label>
              </div>

              {/* General submit error (e.g., server errors) */}
              {validationErrors.general && (
                <p
                  className="text-center text-sm text-red-600 dark:text-red-400"
                  role="alert"
                  aria-live="polite"
                >
                  {validationErrors.general}
                </p>
              )}

              {/* Submit button */}
              <div>
                <button
                  type="submit"
                  disabled={signupMutation.isLoading}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    signupMutation.isLoading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                >
                  {signupMutation.isLoading ? "Signing up..." : "Sign Up"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_SignUp;