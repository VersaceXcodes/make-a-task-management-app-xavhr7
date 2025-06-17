import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const GV_PublicTopNav: React.FC = () => {
  const [isHamburgerMenuOpen, setIsHamburgerMenuOpen] = useState<boolean>(false);
  const navigate = useNavigate();

  const toggleHamburgerMenu = useCallback(() => {
    setIsHamburgerMenuOpen((open) => !open);
  }, []);

  const navigateToSignIn = useCallback(() => {
    setIsHamburgerMenuOpen(false);
    navigate('/signin');
  }, [navigate]);

  const navigateToSignUp = useCallback(() => {
    setIsHamburgerMenuOpen(false);
    navigate('/signup');
  }, [navigate]);

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 h-[var(--nav-height)] flex items-center justify-between px-4 md:px-8"
        role="navigation"
        aria-label="Public top navigation bar"
      >
        {/* Logo Left */}
        <div className="flex items-center">
          <Link
            to="/"
            className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
            aria-label="TaskCraft Home"
          >
            TaskCraft
          </Link>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-4">
          <button
            type="button"
            onClick={navigateToSignIn}
            className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
            aria-label="Go to Sign In"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={navigateToSignUp}
            className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 font-semibold px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
            aria-label="Go to Sign Up"
          >
            Sign Up
          </button>
        </div>

        {/* Mobile Hamburger */}
        <div className="md:hidden">
          <button
            type="button"
            className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
            aria-controls="mobile-menu"
            aria-expanded={isHamburgerMenuOpen}
            aria-label="Toggle menu"
            onClick={toggleHamburgerMenu}
          >
            <svg
              className={`${isHamburgerMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
            <svg
              className={`${isHamburgerMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {isHamburgerMenuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden fixed top-[var(--nav-height)] right-0 left-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-md z-40 flex flex-col text-center"
          role="menu"
          aria-label="Mobile menu"
        >
          <button
            type="button"
            onClick={navigateToSignIn}
            className="block w-full px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900 font-semibold focus:outline-none focus:bg-indigo-100 dark:focus:bg-indigo-800"
            role="menuitem"
            aria-label="Go to Sign In"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={navigateToSignUp}
            className="block w-full px-4 py-3 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 font-semibold focus:outline-none focus:bg-indigo-700 dark:focus:bg-indigo-600"
            role="menuitem"
            aria-label="Go to Sign Up"
          >
            Sign Up
          </button>
        </div>
      )}
    </>
  );
};

export default GV_PublicTopNav;