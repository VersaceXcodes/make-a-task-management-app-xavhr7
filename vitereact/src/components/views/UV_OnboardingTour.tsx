import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface OnboardingStep {
  title: string;
  description: string;
  highlightSelector: string;
  mediaUrl?: string | null;
}

const defaultStepsContent: OnboardingStep[] = [
  {
    title: "Welcome to TaskCraft",
    description: "Overview of the app's purpose and benefits.",
    highlightSelector: "",
  },
  {
    title: "Create To-Do Lists",
    description: "How to create and manage your to-do lists or projects.",
    highlightSelector: "#sidebar-todo-list-toggle",
  },
  {
    title: "Add Tasks",
    description: "Step to add tasks and subtasks into your lists.",
    highlightSelector: "#add-task-button",
  },
  {
    title: "Set Deadlines and Reminders",
    description: "Guide to set due dates and get reminders.",
    highlightSelector: ".task-card-deadline",
  },
  {
    title: "Collaborate and Comment",
    description: "Invite team members and comment on tasks.",
    highlightSelector: "#team-settings-button",
  },
  {
    title: "Manage Your Dashboard",
    description: "Overview screen for task progress and notifications.",
    highlightSelector: "#dashboard-summary",
  },
];

const UV_OnboardingTour: React.FC = () => {
  const navigate = useNavigate();

  // States
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = defaultStepsContent.length;
  const [modalVisible, setModalVisible] = useState<boolean>(true);
  const [isSkipped, setIsSkipped] = useState<boolean>(false);

  // Ref to hold highlight div element for cleanup
  const highlightRef = useRef<HTMLDivElement | null>(null);
  // Ref for modal container to manage focus accessibility
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Adds highlight effect on the target element for current step
  useEffect(() => {
    // Clean any previous highlight styles and overlays
    function cleanupHighlight() {
      // Remove highlight overlay div if exists
      if (highlightRef.current && highlightRef.current.parentNode) {
        highlightRef.current.parentNode.removeChild(highlightRef.current);
        highlightRef.current = null;
      }
      // Remove highlight class from previous elements
      const prevHighlightedElements = document.querySelectorAll('.uv-onboarding-highlight');
      prevHighlightedElements.forEach((el) => {
        el.classList.remove('uv-onboarding-highlight');
      });
    }

    cleanupHighlight();

    const stepIndex = currentStep - 1;
    if (stepIndex < 0 || stepIndex >= totalSteps) return undefined;

    const step = defaultStepsContent[stepIndex];
    const selector = step.highlightSelector;

    if (!selector) return undefined; // no highlight needed

    const targetElem = document.querySelector(selector);
    if (!targetElem) return undefined;

    // Add a CSS class for direct simple highlight (outline, box shadow)
    targetElem.classList.add('uv-onboarding-highlight');

    // Create an overlay highlight box absolutely positioned around targetElem
    // Get bounding rect relative to viewport and position a div accordingly.

    const rect = targetElem.getBoundingClientRect();

    // Create the highlight overlay div
    const highlightDiv = document.createElement('div');
    highlightDiv.setAttribute('aria-hidden', 'true');
    highlightDiv.style.position = 'fixed';
    highlightDiv.style.top = `${rect.top - 8}px`;
    highlightDiv.style.left = `${rect.left - 8}px`;
    highlightDiv.style.width = `${rect.width + 16}px`;
    highlightDiv.style.height = `${rect.height + 16}px`;
    highlightDiv.style.borderRadius = '0.375rem'; // Tailwind rounded-md (6px)
    highlightDiv.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.7)'; // blue-500 ring
    highlightDiv.style.pointerEvents = 'none';
    highlightDiv.style.zIndex = '1100'; // above modal background but below modal content

    document.body.appendChild(highlightDiv);
    highlightRef.current = highlightDiv;

    // Cleanup on unmount or next effect run
    return () => {
      cleanupHighlight();
    };
  }, [currentStep, totalSteps]);

  // Accessibility: focus modal container on open
  useEffect(() => {
    if (modalVisible && modalRef.current) {
      modalRef.current.focus();
    }
  }, [modalVisible]);

  // Handlers
  const onNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onFinish();
    }
  };

  const onBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const onSkip = () => {
    setIsSkipped(true);
    setModalVisible(false);
    navigate('/dashboard', { replace: true });
  };

  const onFinish = () => {
    setModalVisible(false);
    navigate('/dashboard', { replace: true });
  };

  // If modal not visible, render nothing
  if (!modalVisible) return null;

  // Current step content defensively
  const step = defaultStepsContent[currentStep - 1];

  // Tailwind classes for buttons
  const buttonBaseClasses =
    'px-4 py-2 rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors';

  // Tailwind colors for buttons
  const backBtnClasses = 'text-gray-700 hover:bg-gray-200 focus:ring-blue-500 dark:text-gray-300 dark:hover:bg-gray-700';
  const nextBtnClasses = 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
  const skipBtnClasses = 'text-gray-500 hover:text-gray-700 focus:ring-blue-500';

  return (
    <>
      {/* Modal background overlay */}
      <div
        aria-modal="true"
        role="dialog"
        aria-labelledby="onboarding-modal-title"
        aria-describedby="onboarding-modal-description"
        tabIndex={-1}
        className="fixed inset-0 z-[1050] flex items-center justify-center bg-black bg-opacity-50"
      >
        {/* Modal container */}
        <div
          ref={modalRef}
          className="relative max-w-3xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mx-4 sm:mx-6"
          role="document"
          tabIndex={-1}
        >
          {/* Header */}
          <h2
            id="onboarding-modal-title"
            className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 select-none"
          >
            Step {currentStep} of {totalSteps}: {step.title}
          </h2>

          {/* Description */}
          <p
            id="onboarding-modal-description"
            className="text-gray-700 dark:text-gray-300 mb-6 whitespace-pre-wrap"
          >
            {step.description}
          </p>

          {/* If mediaUrl present in future, render media here - currently no mediaUrl */}
          {/* Highlight instructions box if highlightSelector is present */}
          {step.highlightSelector && step.highlightSelector.trim() !== '' && (
            <p className="text-sm text-blue-600 mb-6 select-none">
              <em>Highlighted element: <code>{step.highlightSelector}</code></em>
            </p>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between items-center space-x-2">
            <button
              type="button"
              onClick={onBack}
              disabled={currentStep === 1}
              className={`${buttonBaseClasses} ${backBtnClasses} ${currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-disabled={currentStep === 1}
              aria-label="Previous step"
            >
              Back
            </button>

            <div className="flex space-x-2 items-center">
              <button
                type="button"
                onClick={onSkip}
                className={`${buttonBaseClasses} ${skipBtnClasses}`}
                aria-label="Skip onboarding tour"
              >
                Skip
              </button>

              <button
                type="button"
                onClick={onNext}
                className={`${buttonBaseClasses} ${nextBtnClasses}`}
                aria-label={currentStep === totalSteps ? 'Finish onboarding tour' : 'Next step'}
              >
                {currentStep === totalSteps ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Styles for highlight class */}
      <style>{`
      .uv-onboarding-highlight {
        position: relative;
        z-index: 1101; /* higher than overlay */
        box-shadow:
          0 0 10px 3px rgba(59, 130, 246, 0.8),
          0 0 0 3px rgba(59, 130, 246, 0.8);
        border-radius: 0.375rem;
        transition: box-shadow 0.3s ease-in-out;
      }
      `}</style>
    </>
  );
};

export default UV_OnboardingTour;