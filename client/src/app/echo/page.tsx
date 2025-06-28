"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  voiceId: string;
}

type RecordingState = "idle" | "recording" | "processing" | "completed";

// LLM response interface
interface LLMResponse {
  correction: string;
  explanation: string;
  correctionVoiceId: string;
  explanationVoiceId: string;
}

// Accuracy response interface
interface AccuracyResponse {
  accuracy: number;
  pronunciationScore: number;
  grammarScore: number;
  fluencyScore: number;
  feedback: string;
}

// Complete Echo response interface
interface EchoResponse {
  transcription?: string;
  llmResponse?: LLMResponse;
  accuracyResponse?: AccuracyResponse;
  audioCorrectionUrl?: string;
  audioExplanationUrl?: string;
  type?: string;
  done?: boolean;
  error?: string;
}

const languages: Language[] = [
  { code: "es-ES", name: "Spanish (Spain)", voiceId: "es-ES-enrique" },
  { code: "fr-FR", name: "French (France)", voiceId: "fr-FR-maxime" },
  { code: "en-US", name: "English (US)", voiceId: "en-US-paul" },
  { code: "hi-IN", name: "Hindi (India)", voiceId: "hi-IN-rahul" },
  { code: "ja-JP", name: "Japanese (Japan)", voiceId: "ja-JP-kenji" },
  { code: "it-IT", name: "Italian (Italy)", voiceId: "it-IT-vincenzo" },
  { code: "de-DE", name: "German (Germany)", voiceId: "de-DE-lia" },
  { code: "nl-NL", name: "Dutch (Netherlands)", voiceId: "nl-NL-dirk" },
  { code: "pt-BR", name: "Portuguese (Brazil)", voiceId: "pt-BR-isadora" },
];

export default function EchoMode() {
  const [learningLanguage, setLearningLanguage] = useState<string>("");
  const [nativeLanguage, setNativeLanguage] = useState<string>("");
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [userText, setUserText] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [correctionText, setCorrectionText] = useState("");
  const [correctionAudio, setCorrectionAudio] = useState("");
  const [explanationAudio, setExplanationAudio] = useState("");
  const [accuracyScores, setAccuracyScores] = useState<AccuracyResponse | null>(
    null
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");

  // Navigation state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const isRecordingRef = useRef<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus("connecting");
    const wsUrl = `ws://localhost:4001?mode=echo&learningLanguage=${learningLanguage}&nativeLanguage=${nativeLanguage}`;
    console.log("Connecting to WebSocket:", wsUrl);
    wsRef.current = new WebSocket(wsUrl);
    wsRef.current.binaryType = "arraybuffer";

    wsRef.current.onopen = () => {
      console.log("WebSocket connected successfully");
      setConnectionStatus("connected");
    };

    wsRef.current.onmessage = (event) => {
      try {
        console.log("Raw message received:", event.data);
        const data: EchoResponse = JSON.parse(event.data);
        console.log("📨 Message from server:", data);

        if (data.error) {
          console.error("Server error:", data.error);
          setRecordingState("idle");
          return;
        }

        if (data.transcription) {
          setUserText(data.transcription);
        }

        if (data.llmResponse) {
          setAiResponse(data.llmResponse.explanation);
          setCorrectionText(data.llmResponse.correction);
        } else {
          // Fallback to direct properties for backward compatibility
          if ((data as any).correction) {
            setCorrectionText((data as any).correction);
          }
          if ((data as any).explanation) {
            setAiResponse((data as any).explanation);
          }
        }

        if (data.accuracyResponse) {
          setAccuracyScores(data.accuracyResponse);
        }

        if (data.audioCorrectionUrl) {
          setCorrectionAudio(data.audioCorrectionUrl);
        }

        if (data.audioExplanationUrl) {
          setExplanationAudio(data.audioExplanationUrl);
        }

        if (data.done || (data.type === "done" && (data as any).done)) {
          setRecordingState("completed");
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
        console.error("Raw message data:", event.data);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error("WebSocket connection error:", error);
      setConnectionStatus("disconnected");
      setRecordingState("idle");
    };

    wsRef.current.onclose = (event) => {
      console.log(
        "WebSocket disconnected. Code:",
        event.code,
        "Reason:",
        event.reason
      );
      setConnectionStatus("disconnected");
    };
  }, [learningLanguage, nativeLanguage]);

  // Auto-connect when both languages are selected
  useEffect(() => {
    if (
      learningLanguage &&
      nativeLanguage &&
      connectionStatus === "disconnected"
    ) {
      console.log("Both languages selected, attempting to connect...");
      connectWebSocket();
    }
  }, [learningLanguage, nativeLanguage, connectionStatus, connectWebSocket]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startRecording = async () => {
    if (!learningLanguage || !nativeLanguage) {
      alert("Please select both learning and native languages first.");
      return;
    }

    try {
      // Connect WebSocket if not connected
      if (connectionStatus !== "connected") {
        connectWebSocket();
        // Wait a bit for connection
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        alert("WebSocket connection not ready. Please try again.");
        return;
      }

      // Get microphone permission and stream
      audioStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Create AudioContext with 16kHz sample rate
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });

      // Add AudioWorklet for PCM processing
      await audioContextRef.current.audioWorklet.addModule(
        URL.createObjectURL(
          new Blob(
            [
              `
              class PCMWorkletProcessor extends AudioWorkletProcessor {
                process(inputs) {
                  const input = inputs[0][0];
                  if (!input) return true;
                  
                  // Convert float32 audio to 16-bit PCM
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
            `,
            ],
            { type: "application/javascript" }
          )
        )
      );

      // Create audio processing chain
      const source = audioContextRef.current.createMediaStreamSource(
        audioStreamRef.current
      );
      workletNodeRef.current = new AudioWorkletNode(
        audioContextRef.current,
        "pcm-worklet"
      );

      // Handle PCM data from worklet
      workletNodeRef.current.port.onmessage = (event) => {
        if (
          wsRef.current?.readyState === WebSocket.OPEN &&
          isRecordingRef.current
        ) {
          // Send binary audio data
          wsRef.current.send(event.data);
        }
      };

      // Connect audio processing chain
      source
        .connect(workletNodeRef.current)
        .connect(audioContextRef.current.destination);

      setRecordingState("recording");
      isRecordingRef.current = true;
      setUserText("");
      setAiResponse("");
      setCorrectionText("");
      setCorrectionAudio("");
      setExplanationAudio("");
      setAccuracyScores(null);
      setPlayingAudio(null);
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("Failed to access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    // Stop sending audio data immediately
    isRecordingRef.current = false;

    // First stop the audio stream and clean up AudioContext
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    // Disconnect and clean up AudioContext and worklet
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Wait a brief moment for any pending audio data to be sent, then send end signal
    setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log("Sending end signal to server");
        // Ensure we send this as text, not binary
        const endMessage = JSON.stringify({ end: true });
        console.log("End message:", endMessage);
        wsRef.current.send(endMessage);
      }
    }, 200); // Increased timeout to ensure all audio processing is complete

    setRecordingState("processing");
  };

  const resetSession = () => {
    // Stop sending audio data
    isRecordingRef.current = false;

    // Stop audio stream
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    // Clean up AudioContext and worklet
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Reset state
    setRecordingState("idle");
    setUserText("");
    setAiResponse("");
    setCorrectionText("");
    setCorrectionAudio("");
    setExplanationAudio("");
    setAccuracyScores(null);
    setPlayingAudio(null);
  };

  const playAudio = (audioUrl: string, audioType: string) => {
    if (!audioUrl) return;

    setIsPlaying(true);
    setPlayingAudio(audioType);

    // Use the audio URL directly if it's already a full URL, otherwise prepend server URL
    const fullUrl = audioUrl.startsWith("http")
      ? audioUrl
      : `http://localhost:4001${audioUrl}`;
    const audio = new Audio(fullUrl);

    audio.onended = () => {
      setIsPlaying(false);
      setPlayingAudio(null);
    };

    audio.onerror = () => {
      setIsPlaying(false);
      setPlayingAudio(null);
      console.error("Failed to play audio");
    };

    audio.play().catch((error) => {
      console.error("Audio playback failed:", error);
      setIsPlaying(false);
      setPlayingAudio(null);
    });
  };

  const canRecord =
    learningLanguage && nativeLanguage && connectionStatus === "connected";

  // Helper function to get language display name
  const getLanguageDisplayName = (code: string) => {
    const lang = languages.find((l: Language) => l.code === code);
    return lang ? lang.name.split(" (")[0] : code; // Remove country part for display
  };

  // Scroll function for Navigation
  const scrollToSection = (sectionId: string) => {
    // Not needed for this page
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Navigation
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        isMounted={isMounted}
        isVisible={isVisible}
        scrollToSection={scrollToSection}
      />

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
                    {languages.map((lang: Language) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <div className="flex items-center space-x-2">
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
                    {languages.map((lang: Language) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <div className="flex items-center space-x-2">
                          <span>{lang.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {learningLanguage &&
              nativeLanguage &&
              connectionStatus === "connected" && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2 text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Ready to practice{" "}
                      {getLanguageDisplayName(learningLanguage)} with{" "}
                      {getLanguageDisplayName(nativeLanguage)} support
                    </span>
                  </div>
                </div>
              )}

            {learningLanguage &&
              nativeLanguage &&
              connectionStatus === "connecting" && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2 text-blue-700">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">
                      Connecting to server...
                    </span>
                  </div>
                </div>
              )}

            {learningLanguage &&
              nativeLanguage &&
              connectionStatus === "disconnected" && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-red-700">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Connection failed. Please try again.
                      </span>
                    </div>
                    <Button
                      onClick={connectWebSocket}
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      Retry Connection
                    </Button>
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

              {/* Audio Level Visualization - Only show during recording */}
              {recordingState === "recording" && (
                <div className="flex items-center justify-center space-x-1 mb-4">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-gradient-to-t from-red-500 to-pink-500 rounded-full transition-all duration-100 animate-pulse"
                      style={{
                        height: `${Math.max(4, Math.random() * 30 + 10)}px`,
                      }}
                    />
                  ))}
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
                    <span>Please select languages and ensure connection</span>
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
        {(userText || aiResponse || correctionText || accuracyScores) && (
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
                      onClick={() => playAudio(explanationAudio, "explanation")}
                      disabled={isPlaying || !explanationAudio}
                      className="flex items-center space-x-2"
                    >
                      {isPlaying && playingAudio === "explanation" ? (
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

            {/* Corrected Version */}
            {correctionText && correctionText !== userText && (
              <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-cyan-50">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Target className="w-5 h-5 text-blue-600" />
                      <CardTitle className="text-lg">
                        Corrected Version
                      </CardTitle>
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Improved
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => playAudio(correctionAudio, "correction")}
                      disabled={isPlaying || !correctionAudio}
                      className="flex items-center space-x-2"
                    >
                      {isPlaying && playingAudio === "correction" ? (
                        <>
                          <VolumeX className="w-4 h-4" />
                          <span>Playing...</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" />
                          <span>Listen to Correction</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-white rounded-lg p-4 border border-blue-100">
                    <p className="text-lg text-gray-800 font-medium">
                      {correctionText}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Accuracy Scores */}
            {accuracyScores && (
              <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-50 to-pink-50">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <CardTitle className="text-lg">
                      Performance Scores
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Overall Accuracy */}
                    <div className="bg-white rounded-lg p-4 border border-purple-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Overall Accuracy
                        </span>
                        <span className="text-lg font-bold text-purple-600">
                          {Math.round(accuracyScores.accuracy)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${accuracyScores.accuracy}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Detailed Scores */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-3 border border-purple-100 text-center">
                        <div className="text-lg font-bold text-purple-600">
                          {Math.round(accuracyScores.pronunciationScore)}%
                        </div>
                        <div className="text-xs text-gray-600">
                          Pronunciation
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-purple-100 text-center">
                        <div className="text-lg font-bold text-purple-600">
                          {Math.round(accuracyScores.grammarScore)}%
                        </div>
                        <div className="text-xs text-gray-600">Grammar</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-purple-100 text-center">
                        <div className="text-lg font-bold text-purple-600">
                          {Math.round(accuracyScores.fluencyScore)}%
                        </div>
                        <div className="text-xs text-gray-600">Fluency</div>
                      </div>
                    </div>

                    {/* Feedback */}
                    {accuracyScores.feedback && (
                      <div className="bg-white rounded-lg p-4 border border-purple-100">
                        <h4 className="font-medium text-gray-900 mb-2">
                          Detailed Feedback
                        </h4>
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {accuracyScores.feedback}
                        </p>
                      </div>
                    )}
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
