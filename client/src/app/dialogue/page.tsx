"use client";

import Navigation from "@/components/LandingPage/Navigation";

export default function DialogueMode() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50">
      <Navigation />

      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold gradient-text mb-6">
            Dialogue Mode
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Practice conversations with AI companion. Coming soon!
          </p>
        </div>
      </div>
    </div>
  );
}
