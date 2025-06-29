"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Trophy,
  Target,
  Brain,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Settings,
  BookOpen,
  Award,
  TrendingUp,
  Languages,
  Sparkles,
  Clock,
  FileText,
} from "lucide-react";
import Navigation from "@/components/LandingPage/Navigation";

interface Language {
  code: string;
  name: string;
  flag: string;
}

interface QuizQuestion {
  id?: string;
  question: string;
  userAnswer?: string;
  correctAnswer?: string;
  isCorrect?: boolean;
  feedback?: string;
  explanation?: string;
}

interface QuizConfig {
  numberOfQuestions: number;
  topic: string;
  learningLanguage: string;
  nativeLanguage: string;
}

interface QuizFeedback {
  isCorrect: boolean;
  score: number;
  feedback: string;
  explanation?: string;
  grammarScore?: number;
  pronunciationScore?: number;
  vocabularyScore?: number;
  comprehensionScore?: number;
  strengthsAndWeaknesses?: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
}

interface QuizSummary {
  score: number;
  totalQuestions: number;
  percentage: number;
  overallFeedback: QuizFeedback;
  questions: QuizQuestion[];
}

type QuizState =
  | "setup"
  | "connecting"
  | "active"
  | "listening"
  | "processing"
  | "feedback"
  | "completed"
  | "error"
  | "waiting";

const languages: Language[] = [
  { code: "es-ES", name: "Spanish", flag: "🇪🇸" },
  { code: "fr-FR", name: "French", flag: "🇫🇷" },
  { code: "en-US", name: "English", flag: "🇺🇸" },
  { code: "hi-IN", name: "Hindi", flag: "🇮🇳" },
  { code: "ja-JP", name: "Japanese", flag: "🇯🇵" },
  { code: "it-IT", name: "Italian", flag: "🇮🇹" },
  { code: "de-DE", name: "German", flag: "🇩🇪" },
  { code: "nl-NL", name: "Dutch", flag: "🇳🇱" },
  { code: "pt-BR", name: "Portuguese", flag: "🇵🇹" },
];

const topics = [
  { value: "general", label: "General" },
  { value: "grammar", label: "Grammar" },
  { value: "vocabulary", label: "Vocabulary" },
  { value: "culture", label: "Culture" },
  { value: "conversation", label: "Conversation" },
];

export default function QuizMode() {
  // Configuration state
  const [config, setConfig] = useState<QuizConfig>({
    numberOfQuestions: 5,
    topic: "general",
    learningLanguage: "es-ES",
    nativeLanguage: "en-US",
  });

  // Quiz state
  const [quizState, setQuizState] = useState<QuizState>("setup");
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(
    null
  );
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);
  const [feedback, setFeedback] = useState<QuizFeedback | null>(null);
  const [summary, setSummary] = useState<QuizSummary | null>(null);
  const [allQuestions, setAllQuestions] = useState<QuizQuestion[]>([]);
  const [error, setError] = useState<string>("");

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const [questionAudioUrl, setQuestionAudioUrl] = useState<string | null>(null);
  const [feedbackAudioUrl, setFeedbackAudioUrl] = useState<string | null>(null);
  const [explanationAudioUrl, setExplanationAudioUrl] = useState<string | null>(
    null
  );

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);
  const waitingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (waitingTimeoutRef.current) {
        clearTimeout(waitingTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanupAudio = useCallback(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
  }, []);

  const handleQuizMessage = useCallback((data: any) => {
    if (data.type === "quiz_question") {
      handleQuizQuestion(data);
    } else if (data.type === "quiz_feedback") {
      handleQuizFeedback(data);
    } else if (data.type === "quiz_summary") {
      handleQuizSummary(data);
    } else if (data.type === "quiz_ended_early") {
      handleQuizEndedEarly(data);
    } else if (data.type === "transcription_failed") {
      handleTranscriptionFailed(data);
    } else if (data.error) {
      // Only set error if it's a critical error that should be shown to user
      if (data.error.includes("Connection") || data.error.includes("Server")) {
        setError(data.error);
      }
      // Log all errors for debugging but don't show toast
      console.error("Quiz error:", data.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQuizQuestion = useCallback((data: any) => {
    console.log("📥 Received quiz question:", data);

    // Clear any waiting timeout
    if (waitingTimeoutRef.current) {
      clearTimeout(waitingTimeoutRef.current);
      waitingTimeoutRef.current = null;
    }

    // Clear previous states immediately
    setFeedback(null);
    setFeedbackAudioUrl(null);
    setExplanationAudioUrl(null);

    // Set new question data
    setCurrentQuestion({
      question: data.question || "No question provided",
      id: data.questionId,
    });
    setCurrentQuestionNumber(data.questionNumber);
    setTotalQuestions(data.totalQuestions);
    setQuestionAudioUrl(data.questionAudioUrl);
    setQuizState("active");

    // Auto-play question audio
    if (data.questionAudioUrl) {
      playAudio(data.questionAudioUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQuizFeedback = useCallback((data: any) => {
    setFeedback(data);
    setCurrentScore(data.score);
    setFeedbackAudioUrl(data.feedbackAudioUrl);
    setExplanationAudioUrl(data.explanationAudioUrl);
    setQuizState("feedback");

    if (data.isCorrect) {
      toast.success("Correct answer!");
    } else {
      toast.error("Incorrect answer");
    }

    // Auto-play feedback audio
    if (data.feedbackAudioUrl) {
      playAudio(data.feedbackAudioUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQuizSummary = useCallback((data: any) => {
    setSummary(data);
    setAllQuestions(data.questions || []);
    setQuizState("completed");
    toast.success("Quiz completed!");

    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const handleQuizEndedEarly = useCallback((data: any) => {
    setSummary(data);
    setAllQuestions(data.questions || []);
    setQuizState("completed");
    toast.success("Quiz ended");
  }, []);

  const handleTranscriptionFailed = useCallback((data: any) => {
    console.log("⚠️ Transcription failed:", data.message);
    setIsRecording(false);
    setIsProcessing(false);
    isRecordingRef.current = false;
    isProcessingRef.current = false;
    toast.error("Could not understand. Please try again.");
  }, []);

  const playAudio = useCallback(async (audioUrl: string) => {
    try {
      setIsPlaying(true);
      setCurrentAudio(audioUrl);

      const fullUrl = audioUrl.startsWith("http")
        ? audioUrl
        : `https://vocalearn-k19l.onrender.com${audioUrl}`;
      const audio = new Audio(fullUrl);

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
        toast.error("Failed to play audio");
      };

      await audio.play();
    } catch (error) {
      console.error("Audio playback failed:", error);
      setIsPlaying(false);
      setCurrentAudio(null);
      toast.error("Failed to play audio");
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setQuizState("connecting");
    const wsUrl = `wss://vocalearn-k19l.onrender.com?mode=quiz&learningLanguage=${config.learningLanguage}&nativeLanguage=${config.nativeLanguage}&numberOfQuestions=${config.numberOfQuestions}&topic=${config.topic}`;

    console.log("Connecting to WebSocket:", wsUrl);
    wsRef.current = new WebSocket(wsUrl);
    wsRef.current.binaryType = "arraybuffer";

    wsRef.current.onopen = () => {
      console.log("WebSocket connected successfully");
      setQuizState("active");
      setError("");
      toast.success("Connected! Starting quiz...");
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📨 Quiz message:", data);
        handleQuizMessage(data);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
        // Don't show toast for JSON parsing errors as they can be normal during connection
      }
    };

    wsRef.current.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      setQuizState("error");
      setError("Connection failed. Please check if the server is running.");
      // Only show toast for critical connection errors
      toast.error("Connection failed. Please check server status.");
    };

    wsRef.current.onclose = () => {
      console.log("WebSocket disconnected");
      if (quizState !== "completed") {
        setQuizState("setup");
      }
    };
  }, [config, handleQuizMessage, quizState]);

  const startQuiz = () => {
    // Clear any previous errors
    setError("");
    connectWebSocket();
  };

  const setupAudioWorklet = async () => {
    const workletCode = `
      class PCMWorkletProcessor extends AudioWorkletProcessor {
        process(inputs) {
          const input = inputs[0][0];
          if (!input) return true;
          const buffer = new ArrayBuffer(input.length * 2);
          const view = new DataView(buffer);
          for (let i = 0; i < input.length; i++) {
            let sample = Math.max(-1, Math.min(1, input[i]));
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(i * 2, sample, true);
          }
          this.port.postMessage(buffer);
          return true;
        }
      }
      registerProcessor('pcm-worklet', PCMWorkletProcessor);
    `;

    await audioContextRef.current!.audioWorklet.addModule(
      URL.createObjectURL(
        new Blob([workletCode], { type: "application/javascript" })
      )
    );
  };

  const startRecording = async () => {
    if (isProcessingRef.current || isRecordingRef.current) return;

    try {
      // Setup audio
      audioStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1 },
      });

      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      await setupAudioWorklet();

      const source = audioContextRef.current.createMediaStreamSource(
        audioStreamRef.current
      );
      workletNodeRef.current = new AudioWorkletNode(
        audioContextRef.current,
        "pcm-worklet"
      );

      workletNodeRef.current.port.onmessage = (event) => {
        if (
          wsRef.current?.readyState === WebSocket.OPEN &&
          isRecordingRef.current
        ) {
          wsRef.current.send(event.data);
        }
      };

      source
        .connect(workletNodeRef.current)
        .connect(audioContextRef.current.destination);

      setIsRecording(true);
      isRecordingRef.current = true;
      setQuizState("listening");
      toast.success("Recording started! Speak your answer.");
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast.error(
        "Failed to start recording. Please check microphone permissions."
      );
    }
  };

  const stopRecording = () => {
    if (isProcessingRef.current || !isRecordingRef.current) return;

    console.log("🛑 Stopping recording...");
    setIsProcessing(true);
    isProcessingRef.current = true;
    setIsRecording(false);
    isRecordingRef.current = false;

    // Stop audio stream
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    // Cleanup audio context
    cleanupAudio();

    // Send end signal
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ end: true }));
    }

    setQuizState("processing");

    // Reset processing flag after delay
    setTimeout(() => {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }, 2000);
  };

  const skipQuestion = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Clear any ongoing recording or processing
      if (isRecording || isProcessing) {
        setIsRecording(false);
        setIsProcessing(false);
        isRecordingRef.current = false;
        isProcessingRef.current = false;
        cleanupAudio();
      }

      // Send skip request
      wsRef.current.send(JSON.stringify({ action: "skip_question" }));
      toast.success("Question skipped");

      // Set state to waiting for next question
      setQuizState("waiting");

      // Set timeout to prevent getting stuck in waiting state
      waitingTimeoutRef.current = setTimeout(() => {
        console.warn("Timeout waiting for next question after skip");
        setQuizState("active");
        toast.error("Failed to load next question. Please try again.");
      }, 10000); // 10 second timeout
    }
  };

  const continueToNext = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Clear feedback state but keep current question until new one arrives
      setFeedback(null);
      setFeedbackAudioUrl(null);
      setExplanationAudioUrl(null);

      // Send next question request
      wsRef.current.send(JSON.stringify({ action: "next_question" }));

      // Set state to waiting for next question
      setQuizState("waiting");

      // Set timeout to prevent getting stuck in waiting state
      waitingTimeoutRef.current = setTimeout(() => {
        console.warn("Timeout waiting for next question");
        setQuizState("active");
        toast.error("Failed to load next question. Please try again.");
      }, 10000); // 10 second timeout
    }
  };

  const endQuiz = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "end_quiz" }));
      toast.success("Quiz ended");
    }
  };

  const resetQuiz = () => {
    cleanupAudio();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (waitingTimeoutRef.current) {
      clearTimeout(waitingTimeoutRef.current);
      waitingTimeoutRef.current = null;
    }
    setQuizState("setup");
    setCurrentQuestion(null);
    setCurrentQuestionNumber(0);
    setTotalQuestions(0);
    setCurrentScore(0);
    setFeedback(null);
    setSummary(null);
    setAllQuestions([]);
    setError("");
    setIsRecording(false);
    setIsProcessing(false);
    isRecordingRef.current = false;
    isProcessingRef.current = false;
  };

  const getLanguageDisplayName = (code: string) => {
    const lang = languages.find((l) => l.code === code);
    return lang ? lang.name.split(" (")[0] : code;
  };

  const progressPercentage =
    totalQuestions > 0 ? (currentQuestionNumber / totalQuestions) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      <Navigation />

      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto">
          {error && quizState === "error" && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {quizState === "setup" && (
            <>
              {/* Quiz Configuration */}
              <Card className="mb-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-2">
                    <Settings className="w-5 h-5 text-orange-600" />
                    <CardTitle className="text-xl">
                      Quiz Configuration
                    </CardTitle>
                  </div>
                  <CardDescription>
                    Customize your quiz settings for the best learning
                    experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Number of Questions (1-20)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={config.numberOfQuestions}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            numberOfQuestions: parseInt(e.target.value) || 5,
                          })
                        }
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Topic
                      </label>
                      <Select
                        value={config.topic}
                        onValueChange={(value) =>
                          setConfig({ ...config, topic: value })
                        }
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {topics.map((topic) => (
                            <SelectItem key={topic.value} value={topic.value}>
                              {topic.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Learning Language
                      </label>
                      <Select
                        value={config.learningLanguage}
                        onValueChange={(value) =>
                          setConfig({ ...config, learningLanguage: value })
                        }
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              <div className="flex items-center space-x-2">
                                <span>{lang.flag}</span>
                                <span>{lang.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Native Language (for explanations)
                      </label>
                      <Select
                        value={config.nativeLanguage}
                        onValueChange={(value) =>
                          setConfig({ ...config, nativeLanguage: value })
                        }
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              <div className="flex items-center space-x-2">
                                <span>{lang.flag}</span>
                                <span>{lang.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center space-x-2 text-orange-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Ready for {config.numberOfQuestions} {config.topic}{" "}
                        questions in{" "}
                        {getLanguageDisplayName(config.learningLanguage)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Start Button */}
              <div className="text-center">
                <Button
                  size="lg"
                  onClick={startQuiz}
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-8 py-6 text-lg"
                >
                  <Trophy className="w-5 h-5 mr-2" />
                  Start Quiz
                </Button>
              </div>
            </>
          )}

          {quizState !== "setup" && quizState !== "completed" && (
            <>
              {/* Progress Section */}
              <Card className="mb-6 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {config.topic.charAt(0).toUpperCase() +
                            config.topic.slice(1)}{" "}
                          Quiz
                        </h2>
                        <p className="text-sm text-gray-500">
                          {getLanguageDisplayName(config.learningLanguage)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-600">
                        {currentScore}/{totalQuestions}
                      </div>
                      <p className="text-sm text-gray-500">Score</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>
                        Question {currentQuestionNumber} of {totalQuestions}
                      </span>
                      <span>{Math.round(progressPercentage)}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Question Section */}
              {(quizState === "active" ||
                quizState === "listening" ||
                quizState === "processing") &&
                currentQuestion && (
                  <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <BookOpen className="w-5 h-5 text-blue-600" />
                          <CardTitle className="text-lg">
                            Current Question
                          </CardTitle>
                        </div>
                        <div className="flex space-x-2">
                          {questionAudioUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => playAudio(questionAudioUrl)}
                              disabled={isPlaying}
                            >
                              {isPlaying &&
                              currentAudio === questionAudioUrl ? (
                                <VolumeX className="w-4 h-4" />
                              ) : (
                                <Volume2 className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={skipQuestion}
                            disabled={quizState === "processing"}
                          >
                            <SkipForward className="w-4 h-4" />
                            Skip
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-white rounded-lg p-6 border border-blue-100">
                        <p className="text-lg text-gray-800 leading-relaxed">
                          {currentQuestion.question}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Waiting for Next Question */}
              {quizState === "waiting" && (
                <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-amber-50 to-orange-50">
                  <CardContent className="p-6 text-center">
                    <div className="mb-4">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                      <p className="text-amber-700 font-medium">
                        Loading next question...
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recording Interface */}
              {(quizState === "active" ||
                quizState === "listening" ||
                quizState === "processing") && (
                <Card className="mb-6 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-6 text-center">
                    <div className="mb-6">
                      <div
                        className={`relative w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center transition-all duration-300 ${
                          quizState === "listening"
                            ? "bg-gradient-to-br from-red-500 to-pink-500 shadow-lg shadow-red-200 animate-pulse"
                            : quizState === "processing"
                            ? "bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-200"
                            : "bg-gradient-to-br from-orange-500 to-red-500"
                        }`}
                      >
                        {quizState === "listening" && (
                          <>
                            <Mic className="w-8 h-8 text-white" />
                            <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping"></div>
                          </>
                        )}
                        {quizState === "processing" && (
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        )}
                        {quizState === "active" && (
                          <MicOff className="w-8 h-8 text-white" />
                        )}
                      </div>

                      <div className="space-y-2">
                        {quizState === "active" && (
                          <p className="text-gray-600">
                            Click the microphone to record your answer
                          </p>
                        )}
                        {quizState === "listening" && (
                          <p className="text-red-600 font-medium">
                            Recording... Speak your answer clearly
                          </p>
                        )}
                        {quizState === "processing" && (
                          <p className="text-blue-600 font-medium">
                            Processing your answer...
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-center space-x-4">
                      {quizState === "active" && (
                        <Button
                          size="lg"
                          onClick={startRecording}
                          className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-8 py-6"
                        >
                          <Mic className="w-5 h-5 mr-2" />
                          Record Answer
                        </Button>
                      )}

                      {quizState === "listening" && (
                        <Button
                          size="lg"
                          onClick={stopRecording}
                          disabled={isProcessing}
                          className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-8 py-6"
                        >
                          <MicOff className="w-5 h-5 mr-2" />
                          Stop Recording
                        </Button>
                      )}

                      <Button
                        size="lg"
                        variant="outline"
                        onClick={endQuiz}
                        disabled={quizState === "processing"}
                        className="px-6 py-6"
                      >
                        End Quiz
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Feedback Section */}
          {quizState === "feedback" && feedback && (
            <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-purple-50 to-pink-50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <CardTitle className="text-lg">Feedback</CardTitle>
                    <Badge
                      className={
                        feedback.isCorrect
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-red-100 text-red-700 border-red-200"
                      }
                    >
                      {feedback.isCorrect ? (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      ) : (
                        <XCircle className="w-3 h-3 mr-1" />
                      )}
                      {feedback.isCorrect ? "Correct" : "Incorrect"}
                    </Badge>
                  </div>
                  <div className="flex space-x-2">
                    {feedbackAudioUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => playAudio(feedbackAudioUrl)}
                        disabled={isPlaying}
                      >
                        <Volume2 className="w-4 h-4" />
                      </Button>
                    )}
                    {explanationAudioUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => playAudio(explanationAudioUrl)}
                        disabled={isPlaying}
                      >
                        <Volume2 className="w-4 h-4" />
                        Explanation
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white rounded-lg p-4 border border-purple-100">
                  <p className="text-gray-800 leading-relaxed">
                    {feedback.feedback}
                  </p>
                </div>

                {feedback.explanation && (
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <h4 className="font-medium text-amber-900 mb-2">
                      📚 Explanation
                    </h4>
                    <p className="text-amber-800 text-sm leading-relaxed">
                      {feedback.explanation}
                    </p>
                  </div>
                )}

                {feedback.strengthsAndWeaknesses && (
                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Strengths */}
                    <div className="bg-white rounded-lg p-4 border border-green-100">
                      <div className="flex items-center space-x-2 mb-3">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <h4 className="font-medium text-green-600">
                          Strengths
                        </h4>
                      </div>
                      <ul className="space-y-1">
                        {feedback.strengthsAndWeaknesses.strengths?.map(
                          (strength, index) => (
                            <li
                              key={index}
                              className="text-sm text-green-700 flex items-start space-x-2"
                            >
                              <span className="text-green-500 mt-0.5">•</span>
                              <span>{strength}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>

                    {/* Weaknesses */}
                    <div className="bg-white rounded-lg p-4 border border-orange-100">
                      <div className="flex items-center space-x-2 mb-3">
                        <Target className="w-4 h-4 text-orange-600" />
                        <h4 className="font-medium text-orange-600">
                          Areas for Improvement
                        </h4>
                      </div>
                      <ul className="space-y-1">
                        {feedback.strengthsAndWeaknesses.weaknesses?.map(
                          (weakness, index) => (
                            <li
                              key={index}
                              className="text-sm text-orange-700 flex items-start space-x-2"
                            >
                              <span className="text-orange-500 mt-0.5">•</span>
                              <span>{weakness}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>

                    {/* Recommendations */}
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <div className="flex items-center space-x-2 mb-3">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <h4 className="font-medium text-blue-600">
                          Recommendations
                        </h4>
                      </div>
                      <ul className="space-y-1">
                        {feedback.strengthsAndWeaknesses.recommendations?.map(
                          (rec, index) => (
                            <li
                              key={index}
                              className="text-sm text-blue-700 flex items-start space-x-2"
                            >
                              <span className="text-blue-500 mt-0.5">•</span>
                              <span>{rec}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="flex justify-center">
                  <Button
                    size="lg"
                    onClick={continueToNext}
                    className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-8 py-6"
                  >
                    Continue to Next Question
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completed Quiz Summary */}
          {quizState === "completed" && summary && (
            <div className="space-y-6">
              <Card className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-emerald-50">
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                      <Trophy className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl text-green-800">
                    Quiz Complete!
                  </CardTitle>
                  <CardDescription className="text-green-600">
                    Well done! Here&apos;s how you performed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Score Display */}
                  <div className="text-center">
                    <div className="text-6xl font-bold text-green-600 mb-2">
                      {summary.score}/{summary.totalQuestions}
                    </div>
                    <div className="text-2xl text-green-700 mb-4">
                      {summary.percentage}%
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-green-200 text-lg px-4 py-2">
                      <Award className="w-4 h-4 mr-2" />
                      {summary.percentage >= 80
                        ? "Excellent!"
                        : summary.percentage >= 60
                        ? "Good Job!"
                        : "Keep Practicing!"}
                    </Badge>
                  </div>

                  {/* Performance Scores */}
                  {summary.overallFeedback && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        {
                          label: "Grammar",
                          score: summary.overallFeedback.grammarScore,
                        },
                        {
                          label: "Pronunciation",
                          score: summary.overallFeedback.pronunciationScore,
                        },
                        {
                          label: "Vocabulary",
                          score: summary.overallFeedback.vocabularyScore,
                        },
                        {
                          label: "Comprehension",
                          score: summary.overallFeedback.comprehensionScore,
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="bg-white rounded-lg p-4 text-center border border-green-100"
                        >
                          <div className="text-sm font-medium text-gray-600 mb-1">
                            {item.label}
                          </div>
                          <div
                            className={`text-xl font-bold ${
                              (item.score || 0) >= 80
                                ? "text-green-600"
                                : (item.score || 0) >= 60
                                ? "text-yellow-600"
                                : "text-red-600"
                            }`}
                          >
                            {Math.round(item.score || 0)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Overall Feedback */}
                  {summary.overallFeedback?.feedback && (
                    <div className="bg-white rounded-lg p-6 border border-green-100">
                      <h4 className="font-medium text-green-900 mb-3 flex items-center">
                        <Brain className="w-4 h-4 mr-2" />
                        Overall Feedback
                      </h4>
                      <p className="text-gray-700 leading-relaxed">
                        {summary.overallFeedback.feedback}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      size="lg"
                      onClick={() => setShowReviewModal(true)}
                      variant="outline"
                      className="px-8 py-6"
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      Review Answers
                    </Button>
                    <Button
                      size="lg"
                      onClick={resetQuiz}
                      className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-8 py-6"
                    >
                      <RotateCcw className="w-5 h-5 mr-2" />
                      Take Another Quiz
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tips Section */}
          <Card className="mt-8 border-0 shadow-lg bg-gradient-to-r from-amber-50 to-orange-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <span>Quiz Mode Tips</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Best Practices</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Listen carefully to each question</li>
                    <li>• Speak clearly and at normal pace</li>
                    <li>• Take your time to think before answering</li>
                    <li>
                      • Don&apos;t worry about perfect pronunciation initially
                    </li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">
                    How Quiz Mode Works
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• AI generates questions based on your level</li>
                    <li>• Provides detailed feedback on your answers</li>
                    <li>• Tracks multiple aspects of language skills</li>
                    <li>• Offers personalized improvement suggestions</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Quiz Review
              </h3>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {allQuestions.map((question, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="font-medium mb-2">
                      Question {index + 1}:
                    </div>
                    <div className="mb-2 text-gray-700">
                      {question.question}
                    </div>
                    <div className="mb-2">
                      <strong>Your Answer:</strong>{" "}
                      {question.userAnswer || "No answer provided"}
                    </div>
                    <div className="mb-2">
                      <strong>Expected:</strong> {question.correctAnswer}
                    </div>
                    {question.isCorrect !== undefined && (
                      <Badge
                        className={
                          question.isCorrect
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-red-100 text-red-700 border-red-200"
                        }
                      >
                        {question.isCorrect ? "Correct" : "Incorrect"}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t">
              <Button
                onClick={() => setShowReviewModal(false)}
                className="w-full"
              >
                Close Review
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
