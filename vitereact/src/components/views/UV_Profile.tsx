import React, { useState, useEffect } from "react";
import axios from "axios";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAppStore } from "@/store/main";
import { Link } from "react-router-dom";

interface UserProfile {
  name: string;
  email: string;
  profile_picture: string;
  user_role: string;
}

const UV_Profile: React.FC = () => {
  const token = useAppStore((state) => state.auth_state.token);
  const setAuth = useAppStore((state) => state.set_auth);

  const [editMode, setEditMode] = useState<boolean>(false);
  const [formData, setFormData] = useState<UserProfile | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch current user's profile using react-query
  const fetchUserProfile = async (): Promise<UserProfile> => {
    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/users/profile`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data.user;
  };

  const { data: userProfile, isLoading, isError, error, refetch } = useQuery<UserProfile, Error>(
    ["user_profile"],
    fetchUserProfile,
    { enabled: !!token }
  );

  // When profile is fetched (and not editing), set the formData state
  useEffect(() => {
    if (userProfile && !editMode) {
      setFormData(userProfile);
    }
  }, [userProfile, editMode]);

  // Mutation for updating user profile data
  const updateUserProfile = async (updatedProfile: UserProfile): Promise<UserProfile> => {
    const response = await axios.put(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/users/profile`,
      updatedProfile,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data.user;
  };

  const mutation = useMutation<UserProfile, Error, UserProfile>(updateUserProfile, {
    onSuccess: (updatedUser) => {
      setFormData(updatedUser);
      // Update global auth state with the new profile information
      setAuth({ token: token, user: updatedUser, is_authenticated: true });
      setStatusMessage("Profile updated successfully.");
      setErrors({});
      setEditMode(false);
      refetch();
    },
    onError: (err: Error) => {
      setStatusMessage(`Error updating profile: ${err.message}`);
    },
  });

  // Handler for input changes in edit mode
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...(prev as UserProfile),
      [name]: value,
    }));
  };

  // Handle the form submission for updating the profile
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let currentErrors: Record<string, string> = {};
    if (!formData?.name.trim()) {
      currentErrors.name = "Name is required.";
    }
    if (!formData?.email.trim()) {
      currentErrors.email = "Email is required.";
    }
    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      return;
    }
    mutation.mutate(formData as UserProfile);
  };

  // Toggle edit mode and optionally reset form data when cancelling edit
  const toggleEditMode = () => {
    setEditMode((prevMode) => {
      const newMode = !prevMode;
      if (!newMode) {
        setFormData(userProfile || null);
        setErrors({});
        setStatusMessage("");
      }
      return newMode;
    });
  };

  return (
    <>
      <div className="max-w-4xl mx-auto p-4">
        {isLoading ? (
          <div className="text-center">Loading...</div>
        ) : isError ? (
          <div className="text-center text-red-500">
            Error loading profile: {error?.message}
          </div>
        ) : (
          <div className="bg-white shadow-md rounded p-6">
            <h1 className="text-2xl font-bold mb-4">Profile</h1>
            {statusMessage && (
              <div className="mb-4 p-2 bg-green-100 text-green-800 rounded">{statusMessage}</div>
            )}
            {!editMode ? (
              <>
                <div className="flex items-center mb-4">
                  <img
                    src={formData?.profile_picture || "https://picsum.photos/seed/profile/100"}
                    alt="Profile"
                    className="w-24 h-24 rounded-full mr-4"
                  />
                  <div>
                    <p className="text-lg font-semibold">{formData?.name}</p>
                    <p className="text-gray-600">{formData?.email}</p>
                    <p className="text-sm text-gray-500">{formData?.user_role}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleEditMode}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Edit Profile
                </button>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData?.name || ""}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData?.email || ""}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Profile Picture URL</label>
                  <input
                    type="text"
                    name="profile_picture"
                    value={formData?.profile_picture || ""}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={toggleEditMode}
                    className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            <div className="mt-6">
              <Link to="/dashboard" className="text-blue-600 hover:underline">
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_Profile;