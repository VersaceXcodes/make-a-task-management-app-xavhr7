import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { use_app_store, Notification } from '@/store/main';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const fetchNotifications = async (): Promise<Notification[]> => {
  const { data } = await axios.get(`${API_BASE}/notifications`, {
    params: { page: 1, page_size: 5 },
    headers: { Authorization: `Bearer ${window.localStorage.getItem('token') || ''}` },
  });
  return data.notifications;
};

const updateUserProfile = async (dark_mode_enabled: boolean) => {
  const { data } = await axios.put(
    `${API_BASE}/user/profile`,
    { dark_mode_enabled },
    { headers: { Authorization: `Bearer ${window.localStorage.getItem('token') || ''}` } }
  );
  return data;
};

const logoutApiCall = async () => {
  await axios.post(
    `${API_BASE}/auth/logout`,
    {},
    { headers: { Authorization: `Bearer ${window.localStorage.getItem('token') || ''}` } }
  );
};

const GV_TopNav: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Global app store state & setters
  const token = use_app_store((state) => state.auth.token);
  const isAuthenticated = use_app_store((state) => state.auth.is_authenticated);
  const user_profile = use_app_store((state) => state.user_profile);
  const user_setting = use_app_store((state) => state.user_setting);
  const notifications = use_app_store((state) => state.notifications);
  const unreadNotificationCount = use_app_store((state) => state.unread_count);

  const set_auth = use_app_store((state) => state.set_auth);
  const set_user_profile = use_app_store((state) => state.set_user_profile);
  const set_user_setting = use_app_store((state) => state.set_user_setting);
  const set_notifications = use_app_store((state) => state.set_notifications);
  const set_unread_count = use_app_store((state) => state.set_unread_count);

  // Local state variables
  const [searchQuery, set_searchQuery] = useState<string>('');
  const [notificationsDropdownOpen, set_notificationsDropdownOpen] = useState<boolean>(false);
  const [profileMenuOpen, set_profileMenuOpen] = useState<boolean>(false);
  const [isDarkModeEnabled, set_isDarkModeEnabled] = useState<boolean>(user_setting.dark_mode_enabled);

  // On mount, sync local dark mode state with global store
  useEffect(() => {
    set_isDarkModeEnabled(user_setting.dark_mode_enabled);
  }, [user_setting.dark_mode_enabled]);

  // Fetch notifications when dropdown is opened
  const {
    data: latestNotifications,
    refetch: refetchNotifications,
    isFetching: isFetchingNotifications,
  } = useQuery<Notification[], Error>(
    ['notifications-limited'],
    () => {
      return axios
        .get(`${API_BASE}/notifications`, {
          params: { page: 1, page_size: 5 },
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => res.data.notifications);
    },
    {
      enabled: false, // manual fetch on dropdown open
      refetchOnWindowFocus: false,
      onSuccess: (data) => {
        set_notifications(data);
        const unreadCount = data.reduce((acc, n) => (n.is_read ? acc : acc + 1), 0);
        set_unread_count(unreadCount);
      },
    }
  );

  // Mutation for logout
  const logoutMutation = useMutation<void, Error>(logoutApiCall, {
    onSuccess: () => {
      // Clear all user-related store
      set_auth({ token: '', is_authenticated: false, user_id: '' });
      set_user_profile({ user_id: '', email: '', full_name: null });
      set_user_setting({ dark_mode_enabled: false, timezone_offset: 0, notif_in_app_enabled: true, notif_push_enabled: true });
      set_notifications([]);
      set_unread_count(0);
      navigate('/', { replace: true });
    },
    onError: (error) => {
      // For now, log error but proceed
      console.error('Logout failed:', error.message);
      set_auth({ token: '', is_authenticated: false, user_id: '' });
      navigate('/', { replace: true });
    },
  });

  // Mutation for updating user dark mode preference
  const darkModeMutation = useMutation(updateUserProfile, {
    onSuccess: (data) => {
      if (data && data.user_setting) {
        set_user_setting(data.user_setting);
      }
    },
    onError: (error) => {
      console.error('Failed to update dark mode:', error.message);
      // Revert toggle visually on error?
      set_isDarkModeEnabled((prev) => !prev);
    },
  });

  // Handlers
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleToggleNotificationsDropdown = () => {
    const newValue = !notificationsDropdownOpen;
    set_notificationsDropdownOpen(newValue);
    if (newValue) {
      refetchNotifications();
      set_profileMenuOpen(false);
    }
  };

  const handleToggleProfileMenu = () => {
    const newValue = !profileMenuOpen;
    set_profileMenuOpen(newValue);
    if (newValue) {
      set_notificationsDropdownOpen(false);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    set_searchQuery(e.target.value);
  };

  const handleSearchSubmit = () => {
    const q = searchQuery.trim();
    if (q.length > 0) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      set_searchQuery('');
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    }
  };

  const handleToggleDarkMode = () => {
    const newDarkMode = !isDarkModeEnabled;
    set_isDarkModeEnabled(newDarkMode);
    darkModeMutation.mutate(newDarkMode);
  };

  // Click outside handler to close dropdowns
  const navRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!navRef.current) return;
      if (!navRef.current.contains(event.target as Node)) {
        set_profileMenuOpen(false);
        set_notificationsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 h-[var(--nav-height)] flex items-center justify-between px-4 md:px-6 shadow-sm"
        ref={navRef}
        aria-label="Primary Navigation"
      >
        {/* Left: Logo & Hamburger */}
        <div className="flex items-center space-x-3">
          {/* Logo / Home */}
          <Link
            to="/dashboard"
            className="flex items-center text-gray-900 dark:text-white font-bold text-lg hover:text-indigo-600"
            aria-label="TaskCraft Home"
          >
            TaskCraft
          </Link>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 mx-4 max-w-xl">
          <div className="relative text-gray-600 focus-within:text-gray-900 dark:focus-within:text-white">
            <input
              type="search"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md py-1.5 pl-10 pr-10 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search tasks..."
              aria-label="Search tasks"
              value={searchQuery}
              onChange={handleSearchInputChange}
              onKeyDown={handleSearchKeyDown}
              autoComplete="off"
              spellCheck={false}
            />
            <svg
              className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <button
              type="button"
              onClick={handleSearchSubmit}
              aria-label="Submit search"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 focus:outline-none"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right: Notifications, Dark Mode Toggle, Profile Menu */}
        <div className="flex items-center space-x-3 relative">
          {/* Notifications Icon */}
          <button
            type="button"
            aria-haspopup="true"
            aria-expanded={notificationsDropdownOpen}
            aria-label={`Notifications (${unreadNotificationCount} unread)`}
            onClick={handleToggleNotificationsDropdown}
            className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <svg
              className="w-6 h-6 text-gray-600 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V5a2 2 0 10-4 0v.083A6 6 0 004 11v3.159c0 .538-.214 1.055-.595 1.436L2 17h5m5 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadNotificationCount > 0 && (
              <span className="absolute top-0 right-0 -mt-1 -mr-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-semibold leading-none text-white bg-red-600">
                {unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {notificationsDropdownOpen && (
            <div
              className="absolute right-0 mt-12 w-72 max-h-80 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50"
              role="menu"
              aria-label="Notifications dropdown"
            >
              {isFetchingNotifications && (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">Loading...</div>
              )}
              {!isFetchingNotifications && latestNotifications && latestNotifications.length === 0 && (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">No notifications</div>
              )}
              {!isFetchingNotifications && latestNotifications && latestNotifications.length > 0 && (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {latestNotifications.map((notif) => (
                    <li key={notif.notification_id}>
                      <Link
                        to="/notifications"
                        className={`block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700 ${
                          notif.is_read ? 'text-gray-700 dark:text-gray-300' : 'font-semibold text-indigo-600 dark:text-indigo-400'
                        }`}
                        role="menuitem"
                        onClick={() => set_notificationsDropdownOpen(false)}
                      >
                        <span className="block truncate">{notif.content}</span>
                        <time
                          className="block text-xs text-gray-400 dark:text-gray-500 mt-0.5"
                          dateTime={notif.created_at}
                          title={new Date(notif.created_at).toLocaleString()}
                        >
                          {new Date(notif.created_at).toLocaleDateString()}
                        </time>
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link
                      to="/notifications"
                      className="block px-4 py-2 text-center text-sm text-indigo-600 dark:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
                      role="menuitem"
                      onClick={() => set_notificationsDropdownOpen(false)}
                    >
                      View all notifications
                    </Link>
                  </li>
                </ul>
              )}
            </div>
          )}

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={handleToggleDarkMode}
            aria-label={isDarkModeEnabled ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {isDarkModeEnabled ? (
              <svg
                className="w-6 h-6 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M10 15a5 5 0 100-10 5 5 0 000 10z" />
                <path
                  fillRule="evenodd"
                  d="M10 1a1 1 0 011 1v1a1 1 0 11-2 0V2a1 1 0 011-1zm0 14a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm7-7a1 1 0 010 2h-1a1 1 0 110-2h1zm-14 0a1 1 0 010 2H2a1 1 0 110-2h1zm11.657-5.657a1 1 0 00-1.414 1.414L14.586 6.95a1 1 0 101.414-1.414l-1.343-1.343zm-9.9 9.9a1 1 0 001.414-1.414L5.414 13.05a1 1 0 10-1.414 1.414l1.343 1.343zm9.9 1.414a1 1 0 01-1.414-1.414l1.343-1.343a1 1 0 011.414 1.414l-1.343 1.343zm-9.9-9.9a1 1 0 011.414-1.414L6.95 5.414a1 1 0 10-1.414 1.414l1.343 1.343z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6 text-gray-600 dark:text-gray-300"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M17.293 13.95a8 8 0 11-11.243-11.3 7 7 0 1011.242 11.3z" />
              </svg>
            )}
          </button>

          {/* Profile Avatar */}
          <div className="relative">
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={profileMenuOpen}
              aria-label="User profile menu"
              onClick={handleToggleProfileMenu}
              className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <span className="sr-only">Open user menu</span>
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold uppercase select-none">
                {/* Use initials or fallback */}
                {user_profile.full_name
                  ? user_profile.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                  : user_profile.email[0].toUpperCase()}
              </div>
            </button>

            {/* Profile dropdown */}
            {profileMenuOpen && (
              <div
                className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50"
                role="menu"
                aria-orientation="vertical"
                aria-label="User profile options"
              >
                <Link
                  to="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  role="menuitem"
                  onClick={() => set_profileMenuOpen(false)}
                >
                  Profile & Preferences
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    set_profileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-100 dark:hover:bg-red-700 dark:text-red-400"
                  role="menuitem"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};

export default GV_TopNav;