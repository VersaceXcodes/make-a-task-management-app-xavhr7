import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { useAppStore } from "@/store/main";

interface RegistrationPayload {
  name: string;
  email: string;
  password: string;
  profile_picture?: string;
}

interface RegistrationResponse {
  message: string;
  token: string;
  user: {
    user_id: string;
    name: string;
    email: string;
    profile_picture: string;
    user_role: string;
  };
}

const UV_Registration: React.FC = () => {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [profile_picture, setProfilePicture] = useState<string>("");
  const [validation_errors, set_validation_errors] = useState<Record<string, string>>({});
  const [is_registration_successful, set_is_registration_successful] = useState<boolean>(false);

  const navigate = useNavigate();
  const setAuth = useAppStore((state) => state.set_auth);

  const registrationMutation = useMutation<RegistrationResponse, AxiosError, RegistrationPayload>({
    mutationFn: async (newUser: RegistrationPayload) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/register`,
        newUser
      );
      return response.data;
    },
    onSuccess: (data) => {
      set_is_registration_successful(true);
      // Optionally update the auth state if auto-login is desired:
      // setAuth({ token: data.token, user: data.user, is_authenticated: true });
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    },
    onError: (error: AxiosError) => {
      if (error.response?.data?.message) {
        set_validation_errors({ email: error.response.data.message });
      } else {
        set_validation_errors({ general: "Registration failed. Please try again." });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    set_validation_errors({});
    const errors: Record<string, string> = {};
    if (!name.trim()) {
      errors.name = "Name is required";
    }
    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Invalid email format";
    }
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    if (Object.keys(errors).length > 0) {
      set_validation_errors(errors);
      return;
    }
    registrationMutation.mutate({ name, email, password, profile_picture });
  };

  return (
    <div className="max-w-md mx-auto my-8 p-6 bg-white shadow-md rounded">
      <h1 className="text-2xl font-bold mb-4">Register</h1>
      {is_registration_successful ? (
        <div className="bg-green-100 text-green-700 p-4 rounded mb-4">
          Registration successful! Redirecting to login...
        </div>
      ) : (
        <>
          {validation_errors.general && (
            <div className="bg-red-100 text-red-700 p-2 rounded mb-4">
              {validation_errors.general}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border border-gray-300 px-3 py-2 rounded w-full"
              />
              {validation_errors.name && (
                <p className="text-red-500 text-sm mt-1">{validation_errors.name}</p>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border border-gray-300 px-3 py-2 rounded w-full"
              />
              {validation_errors.email && (
                <p className="text-red-500 text-sm mt-1">{validation_errors.email}</p>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-gray-300 px-3 py-2 rounded w-full"
              />
              {validation_errors.password && (
                <p className="text-red-500 text-sm mt-1">{validation_errors.password}</p>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1" htmlFor="profile_picture">
                Profile Picture (optional)
              </label>
              <input
                id="profile_picture"
                type="text"
                value={profile_picture}
                onChange={(e) => setProfilePicture(e.target.value)}
                className="border border-gray-300 px-3 py-2 rounded w-full"
                placeholder="Enter URL for profile picture"
              />
            </div>
            <button
              type="submit"
              disabled={registrationMutation.isLoading}
              className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
            >
              {registrationMutation.isLoading ? "Registering..." : "Register"}
            </button>
          </form>
          <p className="mt-4 text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-500 hover:underline">
              Login
            </Link>
          </p>
        </>
      )}
    </div>
  );
};

export default UV_Registration;