import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAppStore } from "@/store/main";

const GV_Sidebar: React.FC = () => {
  // Access global authentication state (used to conditionally render or adjust behavior)
  const auth_state = useAppStore((state) => state.auth_state);
  
  // Local state: active navigation item and collapse state of the sidebar.
  const [activeNavItem, setActiveNavItem] = useState<string>("dashboard");
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  
  // useLocation hook to capture the current path and update the active nav item accordingly.
  const location = useLocation();
  useEffect(() => {
    const pathname = location.pathname;
    if (pathname.startsWith("/dashboard")) {
      setActiveNavItem("dashboard");
    } else if (pathname.startsWith("/tasks/list")) {
      setActiveNavItem("task_list");
    } else if (pathname.startsWith("/tasks/board")) {
      setActiveNavItem("task_board");
    } else if (pathname.startsWith("/projects")) {
      setActiveNavItem("projects");
    } else if (pathname.startsWith("/profile")) {
      setActiveNavItem("profile");
    }
  }, [location.pathname]);

  // Handle navigation link click by updating the active nav item.
  const handleNavClick = (itemId: string) => {
    setActiveNavItem(itemId);
  };

  // Toggle the sidebar's collapsed state (e.g., when clicking the hamburger icon).
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Navigation items list: each element has an id to track active state, label for display, and path.
  const navItems = [
    { id: "dashboard", label: "Dashboard", path: "/dashboard" },
    { id: "task_list", label: "Tasks List", path: "/tasks/list" },
    { id: "task_board", label: "Tasks Board", path: "/tasks/board" },
    { id: "projects", label: "Projects", path: "/projects" },
    { id: "profile", label: "Profile", path: "/profile" },
  ];

  return (
    <>
      <div className={`h-full flex flex-col ${isCollapsed ? "w-16" : "w-64"} bg-gray-100 border-r border-gray-300`}>
        {/* Header section with hamburger toggle */}
        <div className="p-4 flex justify-between items-center">
          {!isCollapsed && <span className="font-bold text-xl">Menu</span>}
          <button onClick={toggleSidebar} className="text-gray-600 focus:outline-none">
            <svg 
              className="h-6 w-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        {/* Navigation list */}
        <nav className="flex-1">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.id} onClick={() => handleNavClick(item.id)}>
                <Link 
                  to={item.path} 
                  className={`flex items-center p-2 hover:bg-gray-200 transition-colors ${
                    activeNavItem === item.id ? "bg-blue-100 text-blue-600" : "text-gray-700"
                  }`}
                  title={isCollapsed ? item.label : ""}
                >
                  {isCollapsed ? (
                    <span className="mx-auto">{item.label.charAt(0)}</span>
                  ) : (
                    <span>{item.label}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
};

export default GV_Sidebar;