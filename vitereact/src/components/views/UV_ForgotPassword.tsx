import React, { useState, FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { Link } from "react-router-dom";

interface ForgotPasswordPayload {
  email: string;
}

interface ForgotPasswordResponse {
  message: string;
}

const forgotPasswordRequest = async (payload: ForgotPasswordPayload): Promise<ForgotPasswordResponse> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/forgot_password`,
    payload
  );
  return response.data;
};

const UV_ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [error_message, setError_message] = useState<string>("");
  const [is_submitted, setIs_submitted] = useState<boolean>(false);

  const mutation = useMutation<ForgotPasswordResponse, AxiosError, ForgotPasswordPayload>(forgotPasswordRequest, {
    onSuccess: (data) => {
      setMessage(data.message);
      setIs_submitted(true);
      setError_message("");
    },
    onError: (error) => {
      const errMsg = (axios.isAxiosError(error) && error.response?.data?.message) || "Error submitting the password reset request.";
      setError_message(errMsg);
      setIs_submitted(false);
    }
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError_message("");
    mutation.mutate({ email });
  };

  return (
    <>
      <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow-md rounded-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Forgot Password</h1>
        {!is_submitted ? (
          <form onSubmit={handleSubmit}>
            <p className="mb-4 text-gray-600">
              Please enter your registered email address below. We will send you instructions to reset your password.
            </p>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="you@example.com"
              />
            </div>
            {error_message && (
              <div className="mb-4 text-red-600">
                {error_message}
              </div>
            )}
            <button
              type="submit"
              disabled={mutation.isLoading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {mutation.isLoading ? "Submitting..." : "Reset Password"}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <p className="mb-4 text-green-600 font-semibold">{message || "A password reset link has been sent to your email."}</p>
            <Link to="/login" className="text-blue-600 hover:underline">Back to Login</Link>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_ForgotPassword;