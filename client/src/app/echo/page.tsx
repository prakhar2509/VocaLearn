"use client";

import { useState, useEffect, useRef } from "react";
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
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ArrowLeft,
  Settings,
  RotateCcw,
  Brain,
  AudioWaveform as Waveform,
  Languages,
  MessageSquare,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  Target,
  TrendingUp,
  Repeat,
} from "lucide-react";
import Link from "next/link";
import Navigation from "@/components/LandingPage/Navigation";

interface Language {
  code: string;
  name: string;
  flag: string;
}

const languages: Language[] = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
];

type RecordingState = "idle" | "recording" | "processing" | "completed";

export default function EchoMode() {
  const [learningLanguage, setLearningLanguage] = useState<string>("");
  const [nativeLanguage, setNativeLanguage] = useState<string>("");
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [userText, setUserText] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [pronunciationScore, setPronunciationScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const recordingTimerRef = useRef<NodeJS.Timeout>();
  const audioLevelRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (recordingState === "recording") {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Simulate audio level animation
      audioLevelRef.current = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (audioLevelRef.current) {
        clearInterval(audioLevelRef.current);
      }
      if (recordingState === "idle") {
        setRecordingTime(0);
        setAudioLevel(0);
      }
    }

    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (audioLevelRef.current) clearInterval(audioLevelRef.current);
    };
  }, [recordingState]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = () => {
    if (!learningLanguage || !nativeLanguage) {
      alert("Please select both learning and native languages first.");
      return;
    }
    setRecordingState("recording");
    setUserText("");
    setAiResponse("");
    setPronunciationScore(0);
  };

  const stopRecording = () => {
    setRecordingState("processing");

    // Simulate processing
    setTimeout(() => {
      setUserText("Bonjour, comment allez-vous aujourd'hui?");
      setAiResponse(
        "Excellent pronunciation! You said 'Hello, how are you today?' in French. Your accent is very good - I can hear you're focusing on the French 'r' sound. Try to make the 'ou' in 'vous' a bit more rounded. Let me repeat it with perfect pronunciation:"
      );
      setPronunciationScore(87);
      setRecordingState("completed");
    }, 2000);
  };

  const resetSession = () => {
    setRecordingState("idle");
    setUserText("");
    setAiResponse("");
    setPronunciationScore(0);
    setRecordingTime(0);
    setAudioLevel(0);
  };

  const playAudio = () => {
    setIsPlaying(true);
    // Simulate audio playback
    setTimeout(() => {
      setIsPlaying(false);
    }, 3000);
  };

  const canRecord = learningLanguage && nativeLanguage;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Language Selection */}
        <Card className="mb-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-2">
              <Languages className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-xl">Language Settings</CardTitle>
            </div>
            <CardDescription>
              Select your learning language and native language for personalized
              AI feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Learning Language
                </label>
                <Select
                  value={learningLanguage}
                  onValueChange={setLearningLanguage}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select language to learn" />
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
                  Native Language
                </label>
                <Select
                  value={nativeLanguage}
                  onValueChange={setNativeLanguage}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select your native language" />
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

            {learningLanguage && nativeLanguage && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Ready to practice{" "}
                    {languages.find((l) => l.code === learningLanguage)?.name}{" "}
                    with{" "}
                    {languages.find((l) => l.code === nativeLanguage)?.name}{" "}
                    support
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recording Interface */}
        <Card className="mb-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Repeat className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-xl">Echo Recording</CardTitle>
            </div>
            <CardDescription>
              Speak clearly and the AI will repeat back with perfect
              pronunciation
            </CardDescription>
          </CardHeader>

          <CardContent className="text-center">
            {/* Recording Visualization */}
            <div className="mb-8">
              <div
                className={`relative w-32 h-32 mx-auto mb-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                  recordingState === "recording"
                    ? "bg-gradient-to-br from-red-500 to-pink-500 shadow-lg shadow-red-200 animate-pulse"
                    : recordingState === "processing"
                    ? "bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-200"
                    : recordingState === "completed"
                    ? "bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-200"
                    : "bg-gradient-to-br from-gray-400 to-gray-500"
                }`}
              >
                {recordingState === "recording" && (
                  <>
                    <Mic className="w-12 h-12 text-white" />
                    <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping"></div>
                  </>
                )}
                {recordingState === "processing" && (
                  <Loader2 className="w-12 h-12 text-white animate-spin" />
                )}
                {recordingState === "completed" && (
                  <CheckCircle className="w-12 h-12 text-white" />
                )}
                {recordingState === "idle" && (
                  <MicOff className="w-12 h-12 text-white" />
                )}
              </div>

              {/* Audio Level Visualization */}
              {recordingState === "recording" && (
                <div className="flex items-center justify-center space-x-1 mb-4">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-gradient-to-t from-red-500 to-pink-500 rounded-full transition-all duration-100"
                      style={{
                        height: `${Math.max(
                          4,
                          (audioLevel + Math.random() * 20) * 0.8
                        )}px`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Recording Time */}
              {recordingState === "recording" && (
                <div className="text-2xl font-mono font-bold text-red-600 mb-4">
                  {formatTime(recordingTime)}
                </div>
              )}

              {/* Status Messages */}
              <div className="mb-6">
                {recordingState === "idle" && canRecord && (
                  <p className="text-gray-600">
                    Click the microphone to start recording
                  </p>
                )}
                {recordingState === "idle" && !canRecord && (
                  <p className="text-amber-600 flex items-center justify-center space-x-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Please select languages first</span>
                  </p>
                )}
                {recordingState === "recording" && (
                  <p className="text-red-600 font-medium">
                    Recording... Speak clearly in your learning language
                  </p>
                )}
                {recordingState === "processing" && (
                  <p className="text-blue-600 font-medium">
                    Processing your speech with AI...
                  </p>
                )}
                {recordingState === "completed" && (
                  <p className="text-green-600 font-medium">
                    Analysis complete! Check your feedback below
                  </p>
                )}
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex justify-center space-x-4">
              {recordingState === "idle" && (
                <Button
                  size="lg"
                  onClick={startRecording}
                  disabled={!canRecord}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-6 text-lg"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Start Recording
                </Button>
              )}

              {recordingState === "recording" && (
                <Button
                  size="lg"
                  onClick={stopRecording}
                  className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-8 py-6 text-lg"
                >
                  <MicOff className="w-5 h-5 mr-2" />
                  Stop Recording
                </Button>
              )}

              {recordingState === "completed" && (
                <div className="flex space-x-3">
                  <Button
                    size="lg"
                    onClick={resetSession}
                    variant="outline"
                    className="px-6 py-6"
                  >
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Try Again
                  </Button>
                  <Button
                    size="lg"
                    onClick={startRecording}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-6"
                  >
                    <Mic className="w-5 h-5 mr-2" />
                    New Recording
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {(userText || aiResponse) && (
          <div className="space-y-6">
            {/* User Speech */}
            {userText && (
              <Card className="border-0 shadow-lg bg-gradient-to-r from-indigo-50 to-purple-50">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-5 h-5 text-indigo-600" />
                      <CardTitle className="text-lg">What You Said</CardTitle>
                    </div>
                    {pronunciationScore > 0 && (
                      <Badge
                        className={`${
                          pronunciationScore >= 90
                            ? "bg-green-100 text-green-700 border-green-200"
                            : pronunciationScore >= 70
                            ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                            : "bg-red-100 text-red-700 border-red-200"
                        }`}
                      >
                        <Target className="w-3 h-3 mr-1" />
                        {pronunciationScore}% accuracy
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-white rounded-lg p-4 border border-indigo-100">
                    <p className="text-lg text-gray-800 font-medium">
                      {userText}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Response */}
            {aiResponse && (
              <Card className="border-0 shadow-lg bg-gradient-to-r from-emerald-50 to-green-50">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Brain className="w-5 h-5 text-emerald-600" />
                      <CardTitle className="text-lg">
                        AI Echo & Feedback
                      </CardTitle>
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Perfect Pronunciation
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={playAudio}
                      disabled={isPlaying}
                      className="flex items-center space-x-2"
                    >
                      {isPlaying ? (
                        <>
                          <VolumeX className="w-4 h-4" />
                          <span>Playing...</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" />
                          <span>Listen to Echo</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-white rounded-lg p-4 border border-emerald-100">
                    <p className="text-gray-800 leading-relaxed">
                      {aiResponse}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Tips Section */}
        <Card className="mt-8 border-0 shadow-lg bg-gradient-to-r from-amber-50 to-orange-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <span>Echo Mode Tips</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Best Practices</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Speak at normal conversational pace</li>
                  <li>• Focus on clear pronunciation</li>
                  <li>• Listen carefully to the AI echo</li>
                  <li>• Practice the same phrase multiple times</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">
                  How Echo Mode Works
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• AI analyzes your pronunciation</li>
                  <li>• Provides corrected version with perfect accent</li>
                  <li>• Gives specific improvement tips</li>
                  <li>• Tracks your progress over time</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
