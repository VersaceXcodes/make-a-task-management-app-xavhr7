import React, { useState, ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useAppStore } from "@/store/main";

interface LoginData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface UserResponse {
  uid: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

interface LoginResponse {
  token: string;
  user: UserResponse;
}

const UV_LogIn: React.FC = () => {
  // Local state variables per the datamap
  const [loginData, setLoginData] = useState<LoginData>({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Global state actions from Zustand
  const set_auth_token = useAppStore((state) => state.set_auth_token);
  const set_user_info = useAppStore((state) => state.set_user_info);

  const navigate = useNavigate();

  // Updates loginData state when any input field changes
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setLoginData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Defines React Query mutation for the login process
  const loginMutation = useMutation<LoginResponse, Error, LoginData>({
    mutationFn: async (data: LoginData) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/login`,
        {
          email: data.email,
          password: data.password,
        }
      );
      return response.data;
    },
    onMutate: () => {
      setIsLoggingIn(true);
      setErrorMessage(null);
    },
    onSuccess: (data) => {
      // On success, store token and user info globally and navigate to the dashboard
      set_auth_token(data.token);
      set_user_info(data.user);
      if (loginData.rememberMe) {
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("user_info", JSON.stringify(data.user));
      } else {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_info");
      }
      navigate("/dashboard");
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response) {
        setErrorMessage((error.response.data as any).message || "Login failed");
      } else {
        setErrorMessage(error.message || "Login failed");
      }
    },
    onSettled: () => {
      setIsLoggingIn(false);
    },
  });

  // Submits the login form via React Query mutation
  const submitLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };

  return (
    <>
      <div className="max-w-md mx-auto mt-10 p-6 border rounded shadow-sm">
        <h1 className="text-2xl font-bold mb-4 text-center">Log In</h1>
        {errorMessage && (
          <div className="mb-4 text-red-500 text-center">{errorMessage}</div>
        )}
        <form onSubmit={submitLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={loginData.email}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              name="password"
              id="password"
              value={loginData.password}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              name="rememberMe"
              id="rememberMe"
              checked={loginData.rememberMe}
              onChange={handleInputChange}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
            />
            <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-900">
              Remember Me
            </label>
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoggingIn ? "Logging in..." : "Log In"}
            </button>
          </div>
        </form>
        <div className="mt-4 text-center">
          <Link to="/password-reset" className="text-blue-600 hover:underline">
            Forgot Password?
          </Link>
        </div>
        <div className="mt-2 text-center">
          <span className="text-gray-600">Don't have an account? </span>
          <Link to="/signup" className="text-blue-600 hover:underline">
            Sign Up
          </Link>
        </div>
      </div>
    </>
  );
};

export default UV_LogIn;