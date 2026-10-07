import React, { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";

interface SpeechButtonProps {
  textToSpeak: string;
  className?: string;
}

export default function SpeechButton({ textToSpeak, className = "" }: SpeechButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      // Clean up and cancel speaking on unmount
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeak = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.speechSynthesis) {
      alert("عذراً، متصفحك لا يدعم خاصية نطق النصوص صوتاً.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Cancel any ongoing speech first
    window.speechSynthesis.cancel();

    // Clean up text (remove emojis, clean excess whitespace)
    const cleanText = textToSpeak
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, "")
      .replace(/⚡|⭐|🔥|🎉|🟢|✨|📣|🧭|🏛️|🎓|🔒|📋|📄|📢/g, "")
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "ar-EG"; // Arabic Egypt or ar-SA
    
    // Find Arabic voice if available
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(voice => voice.lang.startsWith("ar"));
    if (arabicVoice) {
      utterance.voice = arabicVoice;
    }

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      onClick={handleSpeak}
      type="button"
      title={isSpeaking ? "إيقاف القراءة الصوتية 🔇" : "استمع للمحتوى بصوت مسموع 🔊"}
      className={`inline-flex items-center justify-center p-2 rounded-full transition-all duration-300 cursor-pointer active:scale-90 border shrink-0 ${
        isSpeaking 
          ? "bg-amber-500 text-white border-amber-600 shadow-md animate-pulse" 
          : "bg-amber-100/50 text-amber-800 hover:bg-amber-500 hover:text-white border-amber-200"
      } ${className}`}
      aria-label={isSpeaking ? "إيقاف القراءة الصوتية" : "قراءة النص بصوت مسموع"}
    >
      {isSpeaking ? (
        <VolumeX className="w-4 h-4" />
      ) : (
        <Volume2 className="w-4 h-4" />
      )}
    </button>
  );
}
