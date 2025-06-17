import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { use_app_store } from "@/store/main";
import { Link, useSearchParams, useNavigate } from "react-router-dom";

type NotificationType = "reminder" | "assignment" | "comment" | "status_change";

interface Notification {
  notification_id: number;
  user_id: string;
  related_task_id: number | null;
  notification_type: NotificationType;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  total_count: number;
  page: number;
  page_size: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const fetchNotifications = async (
  token: string,
  params: {
    is_read?: boolean | null;
    page: number;
    page_size: number;
  }
): Promise<NotificationsResponse> => {
  const queryParams = new URLSearchParams();
  if (params.is_read !== undefined && params.is_read !== null) {
    queryParams.append("is_read", params.is_read.toString());
  }
  queryParams.append("page", params.page.toString());
  queryParams.append("page_size", params.page_size.toString());

  const { data } = await axios.get(`${API_BASE_URL}/notifications?${queryParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
};

const markNotificationRead = async (params: {
  token: string;
  notification_id: number;
  is_read: boolean;
}): Promise<Notification> => {
  const { token, notification_id, is_read } = params;
  const { data } = await axios.put(
    `${API_BASE_URL}/notifications/${notification_id}/read`,
    { is_read },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return data;
};

const NOTIFICATION_TYPES: NotificationType[] = [
  "assignment",
  "comment",
  "reminder",
  "status_change",
];

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  assignment: "Assignments",
  comment: "Comments",
  reminder: "Reminders",
  status_change: "Status Changes",
};

const ISODateToLocalString = (iso: string): string => {
  try {
    const dt = new Date(iso);
    return dt.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const UV_NotificationCenter: React.FC = () => {
  // Global app store access
  const token = use_app_store((state) => state.auth.token);
  const unreadCount = use_app_store((state) => state.unread_count);
  const setUnreadCount = use_app_store((state) => state.set_unread_count);

  // URL search params for is_read, page, page_size (optional)
  const [searchParams, setSearchParams] = useSearchParams();

  // Component local state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filterTypes, setFilterTypes] = useState<NotificationType[]>([]);
  const [page, setPage] = useState<number>(Number(searchParams.get("page") || "1"));
  const [pageSize, setPageSize] = useState<number>(Number(searchParams.get("page_size") || "25"));
  const [isReadFilter, setIsReadFilter] = useState<boolean | null>(() => {
    const v = searchParams.get("is_read");
    if (v === "true") return true;
    if (v === "false") return false;
    return null;
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Loading and error flags
  const [loadingMore, setLoadingMore] = useState(false);
  const [listEnded, setListEnded] = useState(false);
  const [generalLoading, setGeneralLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to merge new notifications, avoiding duplicates by notification_id
  const mergeNotifications = (oldList: Notification[], newList: Notification[]) => {
    const existingIds = new Set(oldList.map((n) => n.notification_id));
    const filteredNew = newList.filter((n) => !existingIds.has(n.notification_id));
    return [...oldList, ...filteredNew];
  };

  // Fetch notifications manually: for load more or initial fetch
  const loadNotifications = useCallback(
    async (pageToLoad: number, append = false) => {
      setError(null);
      if (!token) return;

      if (!append) setGeneralLoading(true);
      else setLoadingMore(true);

      try {
        const res = await fetchNotifications(token, {
          is_read: isReadFilter,
          page: pageToLoad,
          page_size: pageSize,
        });

        if (append) {
          setNotifications((prev) => mergeNotifications(prev, res.notifications));
          setPage(pageToLoad);
          if (res.notifications.length === 0) setListEnded(true);
        } else {
          setNotifications(res.notifications);
          setPage(res.page);
          setListEnded(res.notifications.length < pageSize);
        }

        // Update unread count in global state based on fresh notifications list
        const unreadNewCount = (append ? [...notifications, ...res.notifications] : res.notifications).reduce(
          (acc, n) => (n.is_read ? acc : acc + 1),
          0
        );
        setUnreadCount(unreadNewCount);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.error || err.message);
        } else {
          setError("Failed to load notifications");
        }
      } finally {
        if (!append) setGeneralLoading(false);
        else setLoadingMore(false);
      }
    },
    [token, pageSize, isReadFilter, notifications, setUnreadCount]
  );

  // Initial fetch or when filters/pageSize/isReadFilter change
  useEffect(() => {
    setNotifications([]);
    setPage(1);
    setListEnded(false);
    loadNotifications(1, false);
    // Update URL params
    const params: Record<string, string> = {};
    if (isReadFilter !== null) params.is_read = isReadFilter.toString();
    params.page = "1";
    params.page_size = pageSize.toString();
    setSearchParams(params, { replace: true });
  }, [isReadFilter, pageSize, loadNotifications, setSearchParams]);

  // Load more handler
  const handleLoadMore = () => {
    if (loadingMore || listEnded) return;
    loadNotifications(page + 1, true);
  };

  // Toggle filter type button handler
  const toggleFilterType = (type: NotificationType) => {
    setFilterTypes((current) => {
      if (current.includes(type)) {
        return current.filter((t) => t !== type);
      } else {
        return [...current, type];
      }
    });
  };

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation(
    async () => {
      if (!token) return;

      // Batch mark all unread notifications loaded as read
      const unreadNotifications = notifications.filter((n) => !n.is_read);

      // Sequentially update all unread notifications
      for (const notif of unreadNotifications) {
        // eslint-disable-next-line no-await-in-loop
        await markNotificationRead({ token, notification_id: notif.notification_id, is_read: true });
      }

      return true;
    },
    {
      onSuccess: () => {
        // Update notifications local state: mark all as read
        setNotifications((old) =>
          old.map((n) =>
            n.is_read
              ? n
              : {
                  ...n,
                  is_read: true,
                }
          )
        );
        setUnreadCount(0);
      },
      onError: (error) => {
        // Error handled by react-query mutation error state if needed
        // For demo, no UI aside from possible general error is shown
      },
    }
  );

  // Handler: click notification
  const handleNotificationClick = (notification: Notification) => {
    if (notification.related_task_id) {
      navigate(`/tasks/${notification.related_task_id}`);
    }
  };

  // Client-side filtered notifications by type filterTypes
  const displayedNotifications =
    filterTypes.length === 0
      ? notifications
      : notifications.filter((n) => filterTypes.includes(n.notification_type));

  // Render

  return (
    <>
      <div className="max-w-3xl mx-auto space-y-4">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2 sm:mb-0">
            Notifications Center
          </h1>

          <div className="flex flex-wrap gap-2">
            {NOTIFICATION_TYPES.map((type) => {
              const active = filterTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleFilterType(type)}
                  type="button"
                  className={`px-3 py-1 rounded-full border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 transition
                    ${
                      active
                        ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                        : "border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    }`}
                  aria-pressed={active}
                  title={`Filter by ${NOTIFICATION_TYPE_LABELS[type]}`}
                >
                  {NOTIFICATION_TYPE_LABELS[type]}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isLoading || unreadCount === 0}
              className="ml-4 px-4 py-1 rounded-md bg-green-600 text-white disabled:bg-green-400 disabled:cursor-not-allowed hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              title="Mark all notifications as read"
            >
              {markAllAsReadMutation.isLoading ? "Marking..." : "Mark all as read"}
            </button>
          </div>
        </header>

        {generalLoading ? (
          <div className="text-center py-6 text-gray-600 dark:text-gray-400">Loading notifications...</div>
        ) : error ? (
          <div className="text-center py-6 text-red-600 dark:text-red-400">
            <p>Error loading notifications: {error}</p>
            <button
              type="button"
              onClick={() => loadNotifications(1, false)}
              className="mt-2 px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        ) : displayedNotifications.length === 0 ? (
          <div className="text-center py-6 text-gray-600 dark:text-gray-400">No notifications to display.</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {displayedNotifications.map((notif) => {
              const unreadClass = notif.is_read
                ? "bg-white dark:bg-gray-800"
                : "bg-blue-50 dark:bg-blue-900 font-semibold";

              const notifContent = (
                <div className="flex flex-col sm:flex-row sm:justify-between w-full">
                  <p className="truncate">{notif.content}</p>
                  <time
                    className="text-sm text-gray-500 dark:text-gray-400 mt-1 sm:mt-0 sm:ml-4 flex-shrink-0"
                    dateTime={notif.created_at}
                    title={new Date(notif.created_at).toLocaleString()}
                  >
                    {ISODateToLocalString(notif.created_at)}
                  </time>
                </div>
              );

              // If has a related_task_id, wrap in Link else span
              return (
                <li key={notif.notification_id}>
                  {notif.related_task_id ? (
                    <Link
                      to={`/tasks/${notif.related_task_id}`}
                      onClick={() => handleNotificationClick(notif)}
                      className={`block p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${unreadClass}`}
                    >
                      {notifContent}
                    </Link>
                  ) : (
                    <div
                      className={`block p-3 rounded-md select-none cursor-default ${unreadClass}`}
                      aria-disabled="true"
                    >
                      {notifContent}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex justify-center mt-4">
          {!listEnded && !generalLoading && displayedNotifications.length > 0 && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          )}
          {listEnded && displayedNotifications.length > 0 && (
            <p className="text-gray-500 dark:text-gray-400 py-2 select-none">No more notifications</p>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_NotificationCenter;