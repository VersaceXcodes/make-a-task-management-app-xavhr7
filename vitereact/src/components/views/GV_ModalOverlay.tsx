import React, { useEffect, useCallback } from 'react';
import { use_app_store } from '@/store/main';

interface GV_ModalOverlayProps {
  children?: React.ReactNode;
}

const MODAL_CONTENT_TITLES: Record<string, string> = {
  onboarding: 'Welcome to Onboarding',
  taskCreate: 'Create New Task',
  taskEdit: 'Edit Task',
  confirmDelete: 'Confirm Delete',
  bulkActionConfirm: 'Confirm Bulk Action',
  inviteMember: 'Invite Team Member',
  profileEdit: 'Edit Profile',
};

const GV_ModalOverlay: React.FC<GV_ModalOverlayProps> = ({ children }) => {
  const is_authenticated = use_app_store(state => state.auth.is_authenticated);

  // Modal state stored locally to avoid conflict with Zustand global store until defined
  // If modal state were to be in global store, replace useState with store slices accordingly
  // Because the datamap doesn't specify global modal state, we manage internal states here.
  // In a real app, parents may set modal open/close and content, but this is self-contained.

  const [isOpen, setIsOpen] = React.useState(false);
  const [modalContentType, setModalContentType] = React.useState<string | null>(null);
  const [modalContextData, setModalContextData] = React.useState<Record<string, any>>({});

  // Expose actions to open and close
  const openModal = useCallback(
    (contentType: string, contextData: Record<string, any> = {}) => {
      if (!is_authenticated) return; // restrict access to authenticated users
      setModalContentType(contentType);
      setModalContextData(contextData);
      setIsOpen(true);
    },
    [is_authenticated]
  );

  const resetModalState = useCallback(() => {
    setModalContentType(null);
    setModalContextData({});
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    resetModalState();
  }, [resetModalState]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, closeModal]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Handlers for onboarding modal steps
  const nextOnboardingStep = useCallback(() => {
    if (modalContentType !== 'onboarding') return;
    const currentStep = modalContextData.stepNumber || 1;
    // Increment step number or close modal if last step (assuming 5 steps)
    const nextStep = currentStep + 1;
    if (nextStep > 5) {
      closeModal();
    } else {
      setModalContextData((prev) => ({ ...prev, stepNumber: nextStep }));
    }
  }, [modalContentType, modalContextData, closeModal]);

  const skipOnboarding = useCallback(() => {
    if (modalContentType !== 'onboarding') return;
    // Immediate close
    closeModal();
  }, [modalContentType, closeModal]);

  // Stub submit handler for modal form submissions
  const submitModalForm = useCallback(() => {
    // Actual API calls would be varied per content type (per PRD)
    // Here, we just simulate success and close modal
    closeModal();
  }, [closeModal]);

  // Focus trap refs can be added for accessibility - basic is to put tabIndex and autoFocus on close button
  // For brevity, light implementation done here

  // Return null or empty when modal not open
  // Render full modal overlay with backdrop and central content container
  // If children present, render them as modal content, else fallback to default placeholder according to modalContentType

  return (
    <>
      {isOpen && (
        <>
          <div
            aria-modal="true"
            role="dialog"
            aria-labelledby="modal-title"
            tabIndex={-1}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={closeModal}
            data-testid="modal-backdrop"
          >
            <div
              role="document"
              className="relative max-w-3xl w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                id="modal-title"
                className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4"
              >
                {modalContentType ? MODAL_CONTENT_TITLES[modalContentType] ?? 'Modal' : 'Modal'}
              </h2>
              {/* Close button */}
              <button
                aria-label="Close modal"
                onClick={closeModal}
                className="absolute top-3 right-3 rounded-md text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="button"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Modal main content area */}
              <div className="mt-4 text-gray-700 dark:text-gray-300 min-h-[8rem]">
                {/* Render children if provided, else provide default for the content type */}

                {children ? (
                  children
                ) : modalContentType === 'onboarding' ? (
                  <>
                    <p>
                      This is onboarding step{' '}
                      <strong>{modalContextData.stepNumber ?? 1}</strong> out of 5.
                    </p>
                    <div className="mt-6 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={skipOnboarding}
                        className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none"
                      >
                        Skip
                      </button>
                      <button
                        type="button"
                        onClick={nextOnboardingStep}
                        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        Next
                      </button>
                    </div>
                  </>
                ) : modalContentType === 'confirmDelete' ? (
                  <>
                    <p>Are you sure you want to delete this item? This action cannot be undone.</p>
                    <div className="mt-6 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={submitModalForm}
                        className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white focus:outline-none focus:ring-2 focus:ring-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                ) : modalContentType === 'bulkActionConfirm' ? (
                  <>
                    <p>Confirm bulk action on selected tasks?</p>
                    <div className="mt-6 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={submitModalForm}
                        className="px-4 py-2 rounded bg-yellow-600 hover:bg-yellow-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      >
                        Confirm
                      </button>
                    </div>
                  </>
                ) : modalContentType === 'inviteMember' ? (
                  <>
                    <p>Invite a new member to your team workspace. (Functionality not implemented here.)</p>
                    <div className="mt-6 flex justify-end">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none"
                      >
                        Close
                      </button>
                    </div>
                  </>
                ) : modalContentType === 'taskCreate' || modalContentType === 'taskEdit' ? (
                  <>
                    <p>
                      {modalContentType === 'taskCreate'
                        ? 'Task creation form goes here. Implementation is view-specific and not handled here.'
                        : 'Task edit form goes here. Implementation is view-specific and not handled here.'}
                    </p>
                    <div className="mt-6 flex justify-end">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none mr-2"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={submitModalForm}
                        className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                      >
                        Submit
                      </button>
                    </div>
                  </>
                ) : modalContentType === 'profileEdit' ? (
                  <>
                    <p>User profile edit form placeholder. This is modal content.</p>
                    <div className="mt-6 flex justify-end">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 mr-2 focus:outline-none"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={submitModalForm}
                        className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                      >
                        Save
                      </button>
                    </div>
                  </>
                ) : (
                  <p>No modal content set.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default GV_ModalOverlay;