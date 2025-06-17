import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";

interface PasswordResetRequestPayload {
  email: string;
}

interface MessageResponse {
  message: string;
}

const UV_Password_Reset: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [resetStatus, setResetStatus] = useState<string>("");
  
  // Simple email regex for inline validation.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const passwordResetMutation = useMutation<MessageResponse, Error, PasswordResetRequestPayload>(
    (payload) =>
      axios
        .post(
          `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/password-reset/request`,
          payload
        )
        .then((res) => res.data)
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Validate that the email is not empty and in the correct format.
    if (!email || !emailRegex.test(email)) {
      setResetStatus("Please enter a valid email address.");
      return;
    }
    setResetStatus("");
    passwordResetMutation.mutate({ email }, {
      onSuccess: (data) => {
        setResetStatus(data.message || "Please check your email for further reset instructions.");
      },
      onError: (error) => {
        if (axios.isAxiosError(error) && error.response) {
          setResetStatus(error.response.data.message || error.message || "An error occurred. Please try again.");
        } else {
          setResetStatus(error.message || "An error occurred. Please try again.");
        }
      }
    });
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 border rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Reset Your Password</h1>
      {passwordResetMutation.isSuccess ? (
        <div>
          <p className="mb-4">
            {resetStatus || "Password reset email sent successfully. Please check your email."}
          </p>
          <Link to="/login" className="text-blue-500 hover:underline">
            Return to Log In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="email" className="block mb-2">
              Email Address:
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleInputChange}
              className="mt-1 block w-full border rounded py-2 px-3"
              placeholder="Enter your registered email"
              required
            />
          </div>
          {resetStatus && (
            <p role="alert" aria-live="assertive" className="text-red-500 mb-2">
              {resetStatus}
            </p>
          )}
          <button
            type="submit"
            disabled={passwordResetMutation.isLoading}
            className={`w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 ${
              passwordResetMutation.isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {passwordResetMutation.isLoading ? "Submitting..." : "Submit"}
          </button>
        </form>
      )}
    </div>
  );
};

export default UV_Password_Reset;