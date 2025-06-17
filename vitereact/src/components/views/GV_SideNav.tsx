import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAppStore } from "@/store/main";

const GV_SideNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth_token = useAppStore((state) => state.auth_token);
  // Only render if the user is authenticated
  if (!auth_token) return null;

  // Local state variables for collapsed state and active navigation item.
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [activeNavItem, setActiveNavItem] = useState<string>("");

  // Synchronize activeNavItem with current URL for accurate highlighting
  useEffect(() => {
    if (location.pathname.startsWith("/dashboard")) {
      setActiveNavItem("dashboard");
    } else if (location.pathname.startsWith("/tasks")) {
      setActiveNavItem("tasks");
    } else if (location.pathname.startsWith("/projects")) {
      setActiveNavItem("projects");
    } else if (location.pathname.startsWith("/profile")) {
      setActiveNavItem("profile");
    } else {
      setActiveNavItem("");
    }
  }, [location]);

  // Handler for setting the active nav item when a link is clicked.
  const handleNavItemClick = (item: string) => {
    setActiveNavItem(item);
  };

  // Handler for applying quick filters by navigating to the Tasks view with query parameters.
  const handleQuickFilter = (filter: string) => {
    if (filter === "overdue") {
      navigate("/tasks?filter=overdue");
    } else if (filter === "due-today") {
      navigate("/tasks?filter=due-today");
    }
  };

  // Toggle the collapsed state for responsive design.
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <aside
      className={`bg-gray-800 text-white ${
        isCollapsed ? "w-16" : "w-64"
      } transition-all duration-300 h-full p-4 flex flex-col`}
    >
      <div className="flex justify-end">
        <button
          onClick={toggleCollapse}
          className="text-white focus:outline-none"
          aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {isCollapsed ? <span>&#9776;</span> : <span>&#10005;</span>}
        </button>
      </div>
      <nav className="mt-8">
        <ul>
          <li
            className={`mb-4 cursor-pointer ${
              activeNavItem === "dashboard" ? "font-bold" : "font-normal"
            }`}
          >
            <Link to="/dashboard" onClick={() => handleNavItemClick("dashboard")}>
              {isCollapsed ? "D" : "Dashboard"}
            </Link>
          </li>
          <li
            className={`mb-4 cursor-pointer ${
              activeNavItem === "tasks" ? "font-bold" : "font-normal"
            }`}
          >
            <Link to="/tasks" onClick={() => handleNavItemClick("tasks")}>
              {isCollapsed ? "T" : "Tasks"}
            </Link>
          </li>
          <li
            className={`mb-4 cursor-pointer ${
              activeNavItem === "projects" ? "font-bold" : "font-normal"
            }`}
          >
            <Link to="/projects" onClick={() => handleNavItemClick("projects")}>
              {isCollapsed ? "P" : "Projects"}
            </Link>
          </li>
          <li
            className={`mb-4 cursor-pointer ${
              activeNavItem === "profile" ? "font-bold" : "font-normal"
            }`}
          >
            <Link to="/profile" onClick={() => handleNavItemClick("profile")}>
              {isCollapsed ? "Pr" : "Profile/Settings"}
            </Link>
          </li>
        </ul>
      </nav>
      <div className="mt-auto">
        {!isCollapsed && <p className="text-sm mb-2">Quick Filters</p>}
        <ul>
          <li className="mb-2">
            <button
              type="button"
              onClick={() => handleQuickFilter("overdue")}
              className="cursor-pointer text-left focus:outline-none"
            >
              {isCollapsed ? "O" : "Overdue"}
            </button>
          </li>
          <li className="mb-2">
            <button
              type="button"
              onClick={() => handleQuickFilter("due-today")}
              className="cursor-pointer text-left focus:outline-none"
            >
              {isCollapsed ? "T" : "Due Today"}
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default GV_SideNav;