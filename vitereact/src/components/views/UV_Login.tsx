import React, { useState, KeyboardEvent, FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { useAppStore } from "@/store/main";

// Define interfaces for payload and response
interface LoginPayload {
  email: string;
  password: string;
}

interface User {
  user_id: string;
  name: string;
  email: string;
  profile_picture?: string;
  user_role: string;
}

interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

const UV_Login: React.FC = () => {
  // Local state variables
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error_message, setErrorMessage] = useState<string>("");
  const [is_loading, setIsLoading] = useState<boolean>(false);

  // Global state store actions
  const set_auth = useAppStore((state) => state.set_auth);

  // React Router navigation
  const navigate = useNavigate();

  // Define mutation for login API call using @tanstack/react-query
  const loginMutation = useMutation<LoginResponse, Error, LoginPayload>(
    async (payload: LoginPayload) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/login`,
        payload
      );
      return response.data;
    },
    {
      onMutate: () => {
        setIsLoading(true);
        setErrorMessage("");
      },
      onSuccess: (data: LoginResponse) => {
        // Update global auth state with token and user details
        set_auth({
          token: data.token,
          user: data.user,
          is_authenticated: true,
        });
        // Navigate to the dashboard
        navigate("/dashboard");
      },
      onError: (error: Error) => {
        setErrorMessage(error.message || "Invalid credentials");
      },
      onSettled: () => {
        setIsLoading(false);
      },
    }
  );

  // Handler for form submission
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Basic validation before sending request
    if (!email || !password) {
      setErrorMessage("Email and password are required.");
      return;
    }
    loginMutation.mutate({ email, password });
  };

  // Handler for detecting 'Enter' key press in input fields
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      // Trigger form submission on Enter key press
      (e.target as HTMLInputElement).form?.requestSubmit();
    }
  };

  return (
    <>
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md bg-white p-8 rounded shadow-md">
          <h2 className="text-2xl font-semibold text-center mb-6">Login</h2>
          {error_message && (
            <div className="mb-4 text-red-600 text-center">{error_message}</div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
                placeholder="Enter your email"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 mb-2" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
                placeholder="Enter your password"
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={is_loading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded focus:outline-none focus:ring"
              >
                {is_loading ? "Logging in..." : "Login"}
              </button>
            </div>
          </form>
          <div className="mt-6 flex justify-between text-sm">
            <Link to="/forgot_password" className="text-blue-500 hover:underline">
              Forgot Password?
            </Link>
            <Link to="/register" className="text-blue-500 hover:underline">
              Register
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Login;