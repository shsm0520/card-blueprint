import { Metadata } from "next";
import CreateTreeForm from "@/components/create/CreateTreeForm";
import Disclaimers from "@/components/tree/Disclaimers";
import { CreditCard } from "lucide-react";

export const metadata: Metadata = {
  title: "Create Your Card Strategy Tree",
  description:
    "Build a personalized credit card strategy roadmap. Get recommendations based on your credit profile, Chase 5/24 status, and goals.",
  robots: {
    index: true, // Don't index creation page
    follow: true,
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 sm:p-3 bg-blue-600 rounded-lg">
              <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                Card Strategy Tree
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Build your personalized roadmap
              </p>
            </div>
          </div>
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
            Create a visual credit card application strategy based on your
            credit profile and goals. Get personalized recommendations and share
            your strategy with others.
          </p>
        </div>
      </header>

      {/* How it Works */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
            How It Works
          </h2>
          <ol className="space-y-3 text-sm sm:text-base text-gray-700">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                1
              </span>
              <span>
                <strong>Tell us about your credit profile</strong> - Your Chase
                5/24 status, credit history, and goals
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </span>
              <span>
                <strong>Get instant recommendations</strong> - We'll create a
                starter tree based on your profile
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                3
              </span>
              <span>
                <strong>Share your strategy</strong> - Get a public link to
                share with others (no login required!)
              </span>
            </li>
          </ol>
        </div>

        {/* Disclaimers */}
        <div className="mb-6">
          <Disclaimers />
        </div>

        {/* Create Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
            Create Your Tree
          </h2>
          <CreateTreeForm />
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-sm text-gray-500">
        <p>
          No login required • Anonymous • Free to use • Share your strategies
        </p>
      </footer>
    </div>
  );
}
