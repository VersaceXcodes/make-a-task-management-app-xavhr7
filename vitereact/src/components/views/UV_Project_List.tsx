import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/main";

interface Project {
  uid: string;
  title: string;
  description: string;
  task_count: number;
}

const fetchProjects = async (auth_token: string): Promise<Project[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/projects`,
    {
      headers: { Authorization: `Bearer ${auth_token}` },
    }
  );
  return response.data;
};

const UV_Project_List: React.FC = () => {
  const auth_token = useAppStore((state) => state.auth_token);
  const [filterText, setFilterText] = useState<string>("");

  const { data: projects, isLoading, isError, error } = useQuery<Project[], Error>(
    ["projects"],
    () => fetchProjects(auth_token),
    { enabled: !!auth_token }
  );

  const filteredProjects = projects
    ? projects.filter(
        (project) =>
          project.title.toLowerCase().includes(filterText.toLowerCase()) ||
          project.description.toLowerCase().includes(filterText.toLowerCase())
      )
    : [];

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Project Overview</h1>
        <Link
          to="/projects/new"
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded"
        >
          New Project
        </Link>
      </div>
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search projects..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded"
        />
      </div>
      {isLoading ? (
        <p>Loading projects...</p>
      ) : isError ? (
        <p className="text-red-500">Error fetching projects: {error.message}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.length > 0 ? (
            filteredProjects.map((project) => (
              <Link
                key={project.uid}
                to={`/projects/${project.uid}`}
                className="block border border-gray-200 rounded p-4 hover:shadow-md transition"
              >
                <h2 className="text-xl font-semibold mb-2">{project.title}</h2>
                <p className="text-gray-600 mb-4">
                  {project.description || "No description available."}
                </p>
                <p className="font-medium">Tasks: {project.task_count}</p>
              </Link>
            ))
          ) : (
            <p>No projects found.</p>
          )}
        </div>
      )}
    </>
  );
};

export default UV_Project_List;