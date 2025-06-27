"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  MessageSquare,
  Volume2,
  Globe,
  Users,
  Star,
  ArrowRight,
  Menu,
  X,
  CheckCircle,
  Brain,
  Target,
  Headphones,
  Play,
  Award,
  Sparkles,
  AudioWaveform as Waveform,
} from "lucide-react";

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setIsVisible(true);

    const handleScroll = () => {
      if (typeof window === "undefined") return;

      const sections = document.querySelectorAll("[data-animate]");
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const isInView = rect.top < window.innerHeight * 0.75;
        if (isInView) {
          section.classList.add("animate-in");
        }
      });
    };

    if (typeof window !== "undefined") {
      window.addEventListener("scroll", handleScroll);
      handleScroll(); // Initial check

      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const scrollToSection = (sectionId: string) => {
    if (typeof window === "undefined") return;

    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMenuOpen(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-white">
        <nav className="fixed top-0 w-full z-50 opacity-0 -translate-y-4">
          <div className="bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
            <div className="max-w-7xl mx-auto pl-4 pr-4 sm:pl-6 sm:pr-6 lg:pl-8 lg:pr-8">
              <div className="flex justify-between items-center h-20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Mic className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    VocaLearn
                  </span>
                </div>
              </div>
            </div>
          </div>
        </nav>
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-50 via-white to-purple-50 opacity-0 translate-y-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="text-center lg:text-left">
                <div className="mb-6 h-8 bg-indigo-100 rounded animate-pulse"></div>
                <div className="h-32 bg-gray-100 rounded animate-pulse mb-6"></div>
                <div className="h-20 bg-gray-100 rounded animate-pulse mb-8"></div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${
          isMounted && isVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-4"
        }`}
      >
        <div className="bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  VocaLearn
                </span>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-8">
                <button
                  onClick={() => scrollToSection("hero")}
                  className="text-gray-700 hover:text-indigo-600 transition-colors duration-200 font-medium"
                >
                  Home
                </button>
                <button
                  onClick={() => scrollToSection("how-it-works")}
                  className="text-gray-700 hover:text-indigo-600 transition-colors duration-200 font-medium"
                >
                  How it Works
                </button>
                <button
                  onClick={() => scrollToSection("features")}
                  className="text-gray-700 hover:text-indigo-600 transition-colors duration-200 font-medium"
                >
                  Features
                </button>
                <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6">
                  Get Started
                </Button>
              </div>

              {/* Mobile menu button */}
              <button
                className="md:hidden text-gray-700 p-2"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-lg">
            <div className="px-4 py-6 space-y-4">
              <button
                onClick={() => scrollToSection("hero")}
                className="block w-full text-left text-gray-700 hover:text-indigo-600 transition-colors py-2 font-medium"
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className="block w-full text-left text-gray-700 hover:text-indigo-600 transition-colors py-2 font-medium"
              >
                How it Works
              </button>
              <button
                onClick={() => scrollToSection("features")}
                className="block w-full text-left text-gray-700 hover:text-indigo-600 transition-colors py-2 font-medium"
              >
                Features
              </button>
              <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg">
                Get Started
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section
        id="hero"
        className={`pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-50 via-white to-purple-50 transition-all duration-1000 ${
          isMounted && isVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-8"
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-center lg:text-left">
              <Badge className="mb-6 bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200 transition-colors">
                <Sparkles className="w-4 h-4 mr-2" />
                AI-Powered Language Learning
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Master Languages Naturally with
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent block mt-2">
                  AI Voice Feedback
                </span>
              </h1>

              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Experience the future of language learning with VocaLearn. Speak
                naturally, get instant AI-powered corrections, and improve your
                fluency through real-time voice conversations.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center mb-12">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-6 text-lg"
                >
                  Try Free Demo
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-6 text-lg group"
                >
                  <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  Watch Demo
                </Button>
              </div>

              <div className="flex gap-8 mt-6 lg:justify-start justify-center">
                <div className="text-left">
                  <div className="text-3xl font-bold text-gray-900">50+</div>
                  <div className="text-gray-600 text-sm">Languages</div>
                </div>
                <div className="text-left">
                  <div className="text-3xl font-bold text-gray-900">98%</div>
                  <div className="text-gray-600 text-sm">Success Rate</div>
                </div>
              </div>
            </div>

            {/* Hero Visual - AI Voice Learning Concept */}
            <div className="relative">
              <div className="relative z-10 bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
                {/* Main Image */}
                <div className="relative mb-6">
                  <Image
                    src="https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=800&q=80"
                    alt="Person learning and communicating on laptop for AI-powered language learning"
                    className="rounded-2xl w-full h-64 object-cover"
                    width={800}
                    height={256}
                  />

                  {/* Floating Voice Indicators */}
                  <div className="absolute -top-4 -left-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-3 rounded-xl shadow-lg hover:scale-105 transition-transform duration-300">
                    <Mic className="w-6 h-6" />
                  </div>

                  <div className="absolute -top-4 -right-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white p-3 rounded-xl shadow-lg hover:scale-105 transition-transform duration-300">
                    <Volume2 className="w-6 h-6" />
                  </div>
                </div>

                {/* AI Conversation Simulation */}
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                      <Mic className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-indigo-50 rounded-2xl rounded-tl-sm p-4 flex-1">
                      <p className="text-gray-800 font-medium">
                        &ldquo;Bonjour, comment allez-vous?&rdquo;
                      </p>
                      <div className="flex items-center mt-2 space-x-2">
                        <Waveform className="w-4 h-4 text-indigo-500 opacity-75" />
                        <span className="text-xs text-indigo-600">
                          Analyzing pronunciation...
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-emerald-50 rounded-2xl rounded-tl-sm p-4 flex-1">
                      <p className="text-gray-800 font-medium">
                        Perfect pronunciation! ✨
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        &ldquo;Great job with the French greeting. Try:
                        &lsquo;Je vais bien, merci!&rsquo;&rdquo;
                      </p>
                    </div>
                  </div>
                </div>

                {/* Live Learning Indicators */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">
                      Live AI Feedback
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm text-gray-600">98% Accuracy</span>
                  </div>
                </div>
              </div>

              {/* Background Decorative Elements */}
              <div className="absolute -top-6 -right-6 w-full h-full bg-gradient-to-br from-indigo-200 to-purple-200 rounded-3xl -z-10 opacity-50"></div>
              <div className="absolute -bottom-6 -left-6 w-full h-full bg-gradient-to-tr from-purple-100 to-indigo-100 rounded-3xl -z-20 opacity-30"></div>

              {/* Floating Elements */}
              <div className="absolute top-10 -left-8 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full opacity-10 blur-sm"></div>
              <div className="absolute bottom-20 -right-8 w-12 h-12 bg-gradient-to-br from-pink-400 to-red-500 rounded-full opacity-10 blur-sm"></div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        className="py-20 px-4 sm:px-6 lg:px-8 bg-white"
        data-animate
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How VocaLearn Works
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Three simple steps to transform your language learning experience
              with AI-powered voice technology
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Step 1 */}
            <Card className="relative text-left px-4 py-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-indigo-50 via-white to-purple-50 group rounded-xl min-h-[260px] flex flex-col items-start justify-between">
              {/* Step number */}
              <span className="absolute top-3 right-4 text-[44px] font-bold text-gray-200 opacity-15 select-none pointer-events-none z-0 leading-none">
                01
              </span>
              <CardHeader className="pb-2 z-10 relative flex flex-col items-start">
                <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center mb-2 group-hover:scale-105 transition-transform duration-300 shadow">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-gray-900 mb-1 tracking-tight">
                  Speak Naturally
                </CardTitle>
              </CardHeader>
              <CardContent className="z-10 relative flex-1 flex flex-col justify-center">
                <CardDescription className="text-base sm:text text-gray-600 leading-snug">
                  Just start speaking in your target language. Our advanced
                  speech recognition captures every word, tone, and nuance of
                  your pronunciation.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card className="relative text-left px-4 py-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-blue-50 via-white to-cyan-50 group rounded-xl min-h-[260px] flex flex-col items-start justify-between">
              <span className="absolute top-3 right-4 text-[44px] font-bold text-gray-200 opacity-15 select-none pointer-events-none z-0 leading-none">
                02
              </span>
              <CardHeader className="pb-2 z-10 relative flex flex-col items-start">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-2 group-hover:scale-105 transition-transform duration-300 shadow">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-gray-900 mb-1 tracking-tight">
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="z-10 relative flex-1 flex flex-col justify-center">
                <CardDescription className="text-base sm:text text-gray-600 leading-snug">
                  GPT-4 instantly analyzes your speech for grammar,
                  pronunciation, and fluency. Get personalized corrections and
                  suggestions in real-time.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card className="relative text-left px-4 py-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-emerald-50 via-white to-green-50 group rounded-xl min-h-[260px] flex flex-col items-start justify-between">
              <span className="absolute top-3 right-4 text-[44px] font-bold text-gray-200 opacity-15 select-none pointer-events-none z-0 leading-none">
                03
              </span>
              <CardHeader className="pb-2 z-10 relative flex flex-col items-start">
                <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg flex items-center justify-center mb-2 group-hover:scale-105 transition-transform duration-300 shadow">
                  <Volume2 className="w-5 h-5 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-gray-900 mb-1 tracking-tight">
                  Interactive Response
                </CardTitle>
              </CardHeader>
              <CardContent className="z-10 relative flex-1 flex flex-col justify-center">
                <CardDescription className="text-base sm:text text-gray-600 leading-snug">
                  Receive natural voice responses powered by Murf API that help
                  you practice conversation flow. It's like having a native
                  speaker as your personal tutor.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50"
        data-animate
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Faster Learning
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Advanced AI technology meets intuitive design to create the
              ultimate language learning experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Feature 1 */}
            <Card className="p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-start">
              <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-yellow-500 mb-6">
                <Target className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-lg font-bold text-gray-900 mb-2 text-left">
                Real-time Corrections
              </CardTitle>
              <CardDescription className="text-base sm:text-lg text-gray-600 text-left">
                Get instant feedback on pronunciation, grammar, and vocabulary
                as you speak with contextual explanations.
              </CardDescription>
            </Card>

            {/* Feature 2 */}
            <Card className="p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-start">
              <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-gradient-to-br from-pink-400 to-purple-400 mb-6">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-lg font-bold text-gray-900 mb-2 text-left">
                Natural Conversations
              </CardTitle>
              <CardDescription className="text-base sm:text-lg text-gray-600 text-left">
                Practice with AI that responds naturally and keeps conversations
                flowing like a native speaker.
              </CardDescription>
            </Card>

            {/* Feature 3 */}
            <Card className="p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-start">
              <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-blue-400 mb-6">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-lg font-bold text-gray-900 mb-2 text-left">
                50+ Languages
              </CardTitle>
              <CardDescription className="text-base sm:text-lg text-gray-600 text-left">
                Learn any language with our comprehensive multilingual AI system
                and cultural context.
              </CardDescription>
            </Card>

            {/* Feature 4 */}
            <Card className="p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-start">
              <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-400 mb-6">
                <Headphones className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-lg font-bold text-gray-900 mb-2 text-left">
                Perfect Audio
              </CardTitle>
              <CardDescription className="text-base sm:text-lg text-gray-600 text-left">
                Crystal-clear, natural-sounding voice responses powered by
                advanced text-to-speech technology.
              </CardDescription>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 flex justify-center items-center">
        <div className="max-w-7xl w-full mx-auto">
          <div className="rounded-2xl shadow-2xl bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-10 flex flex-col items-center text-center relative">
            <h2 className="text-3xl font-bold text-white mb-6">
              Powered by GPT-4 & Advanced Speech Recognition
            </h2>
            <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
              Experience the most advanced language learning technology
              available. Our AI understands context, emotion, and cultural
              nuances to provide feedback that&apos;s more accurate than human
              tutors.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-2 justify-center">
              <span className="px-8 py-3 rounded-full bg-white/20 text-white font-semibold text-base shadow-sm backdrop-blur-sm">
                99.2% Accuracy
              </span>
              <span className="px-8 py-3 rounded-full bg-white/20 text-white font-semibold text-base shadow-sm backdrop-blur-sm">
                50ms Response Time
              </span>
              <span className="px-8 py-3 rounded-full bg-white/20 text-white font-semibold text-base shadow-sm backdrop-blur-sm">
                24/7 Available
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-bold">VocaLearn</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md leading-relaxed">
                Revolutionizing language learning through AI-powered voice
                technology. Master any language with real-time feedback and
                natural conversations.
              </p>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center space-x-2 text-gray-400">
                  <Star className="w-4 h-4 fill-current text-yellow-400" />
                  <span>4.9/5 rating</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-6">Product</h3>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <a
                    href="#"
                    className="hover:text-white transition-colors duration-200"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-white transition-colors duration-200"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-white transition-colors duration-200"
                  >
                    Languages
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-white transition-colors duration-200"
                  >
                    Mobile App
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-white transition-colors duration-200"
                  >
                    API
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-6">Company</h3>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <a
                    href="#"
                    className="hover:text-white transition-colors duration-200"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-white transition-colors duration-200"
                  >
                    Blog
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-white transition-colors duration-200"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-white transition-colors duration-200"
                  >
                    Press
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-white transition-colors duration-200"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-400">
              © 2025 VocaLearn. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 sm:mt-0">
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                Privacy Policy
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                Terms of Service
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
