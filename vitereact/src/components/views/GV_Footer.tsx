import React from "react";
import { Link } from "react-router-dom";

const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

const GV_Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <footer className="bg-gray-100 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm py-3 px-4 fixed bottom-0 left-0 w-full md:relative md:flex md:items-center md:justify-between md:px-6 md:py-4 select-none">
        <div className="mb-2 md:mb-0 text-center md:text-left">
          <span>TaskCraft v{APP_VERSION} &copy; {currentYear}</span>
        </div>
        <nav className="flex justify-center space-x-4 md:justify-end" aria-label="Footer navigation">
          <Link
            to="/privacy-policy"
            className="hover:underline focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms-of-service"
            className="hover:underline focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500"
          >
            Terms of Service
          </Link>
        </nav>
      </footer>
      {/* Add bottom padding spacer for fixed footer on desktop */}
      <div className="hidden md:block h-14" />
    </>
  );
};

export default GV_Footer;