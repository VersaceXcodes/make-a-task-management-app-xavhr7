import React, { useState } from "react";
import { Link } from "react-router-dom";

interface FeatureHighlight {
  title: string;
  description: string;
}

const defaultFeatureHighlights: FeatureHighlight[] = [
  { title: "Simple Task Management", description: "Easily organize and prioritize your daily tasks." },
  { title: "Reminders and Deadlines", description: "Never miss important tasks with timely alerts." },
  { title: "Team Collaboration", description: "Work efficiently with your team using shared workspaces." },
];

const UV_Landing: React.FC = () => {
  const [heroImageUrl] = useState<string>("https://picsum.photos/1200/600");
  const [featureHighlights] = useState<FeatureHighlight[]>(defaultFeatureHighlights);

  return (
    <>
      <main className="flex flex-col min-h-[calc(100vh-var(--nav-height)-var(--footer-height))] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {/* Hero Section */}
        <section className="relative bg-gray-100 dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 sm:py-16 md:py-20 flex flex-col-reverse md:flex-row items-center md:items-center gap-10">
            {/* Text Content */}
            <div className="md:flex-1 text-center md:text-left space-y-6">
              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
                TaskCraft: Simplify Your Task Management
              </h1>
              <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 max-w-lg mx-auto md:mx-0">
                Organize, prioritize, and collaborate on your daily tasks and projects with ease.
                Experience productivity like never before.
              </p>
              <div className="flex justify-center md:justify-start space-x-4">
                <Link
                  to="/signup"
                  className="inline-block rounded-md bg-blue-600 px-6 py-3 text-white font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
                  aria-label="Sign Up for TaskCraft"
                >
                  Sign Up
                </Link>
                <Link
                  to="/signin"
                  className="inline-block rounded-md bg-gray-300 dark:bg-gray-700 px-6 py-3 text-gray-900 dark:text-gray-100 font-semibold shadow hover:bg-gray-400 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
                  aria-label="Sign In to TaskCraft"
                >
                  Sign In
                </Link>
              </div>
            </div>

            {/* Hero Image */}
            <div className="md:flex-1 flex justify-center md:justify-end">
              <img
                src={heroImageUrl}
                alt="Illustration showing task management and collaboration"
                className="rounded-lg shadow-lg max-w-full h-auto object-cover w-full max-w-md md:max-w-xl"
                loading="lazy"
                width={1200}
                height={600}
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-white dark:bg-gray-900 py-16 px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">Key Features to Boost Your Productivity</h2>
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              TaskCraft combines essential features designed for individuals and teams to keep you on track.
            </p>
          </div>
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
            {featureHighlights.map((feature, idx) => (
              <article
                key={idx}
                className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-md transition"
                aria-labelledby={`feature-title-${idx}`}
              >
                <h3
                  id={`feature-title-${idx}`}
                  className="text-xl font-semibold mb-2 text-blue-600 dark:text-blue-400"
                >
                  {feature.title}
                </h3>
                <p className="text-gray-700 dark:text-gray-300">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
};

export default UV_Landing;