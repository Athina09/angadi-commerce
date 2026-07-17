/**
 * Tamil voice assistant for vendor hub — Web Speech API (Chrome / Edge).
 * Speaks and listens in ta-IN. Maps phrases to hub navigation + common tasks.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SpeechRecognitionCtor = new () => SpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

const COMMANDS: { patterns: RegExp[]; path: string; reply: string }[] = [
  {
    patterns: [/dashboard|டாஷ்போர்ட|முகப்பு/i],
    path: "/vendor/dashboard",
    reply: "டாஷ்போர்ட் திறக்கிறேன்",
  },
  {
    patterns: [/inventory|பொருள்|லிஸ்டிங்|பட்டியல்/i],
    path: "/vendor/listings",
    reply: "லைவ் இன்வெண்டரி திறக்கிறேன்",
  },
  {
    patterns: [/freshness|புதுமை|தரம்/i],
    path: "/vendor/freshness",
    reply: "புதுமை ஸ்கோர் பக்கம்",
  },
  {
    patterns: [/order|ஆர்டர்|ஆர்டர்கள்/i],
    path: "/vendor/orders",
    reply: "ஆர்டர் பைப்லைன்",
  },
  {
    patterns: [/alert|எச்சரிக்கை/i],
    path: "/vendor/alerts",
    reply: "லோ ஸ்டாக் அலர்ட்ஸ்",
  },
  {
    patterns: [/insight|அறிவு|forecast|முன்னறிவிப்பு/i],
    path: "/vendor/insights",
    reply: "இன்சைட்ஸ் மற்றும் முன்னறிவிப்பு",
  },
  {
    patterns: [/ai|assistant|உதவி|ஆலோசகர்/i],
    path: "/vendor/ai",
    reply: "AI ஆலோசகர்",
  },
  {
    patterns: [/shop|கடை|ஸ்டோர்/i],
    path: "/shop",
    reply: "கடை பக்கம் திறக்கிறேன்",
  },
];

function matchCommand(text: string) {
  return COMMANDS.find((c) => c.patterns.some((p) => p.test(text)));
}

export function VendorVoiceTamil() {
  const navigate = useNavigate();
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [lastHeard, setLastHeard] = useState("");
  const recRef = useRef<SpeechRecognition | null>(null);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ta-IN";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }, []);

  useEffect(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.lang = "ta-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev: SpeechRecognitionEvent) => {
      const text = ev.results[0]?.[0]?.transcript ?? "";
      setLastHeard(text);
      const cmd = matchCommand(text);
      if (cmd) {
        speak(cmd.reply);
        navigate(cmd.path);
      } else {
        speak("மன்னிக்கவும், அந்த கட்டளை புரியவில்லை");
      }
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
  }, [navigate, speak]);

  const toggle = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
      return;
    }
    setListening(true);
    rec.start();
    speak("பேசுங்கள்");
  };

  if (!supported) {
    return (
      <p className="text-xs text-vh-muted px-2">
        Voice (Tamil) needs Chrome/Edge with microphone permission.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-vh-border bg-vh-card p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Volume2 className="h-4 w-4 text-vh-blue" />
        <p className="text-sm font-semibold text-vh-text">தமிழ் குரல் உதவி</p>
      </div>
      <p className="mt-1 text-[11px] text-vh-muted leading-relaxed">
        Say &quot;ஆர்டர்&quot;, &quot;பொருள்&quot;, &quot;புதுமை&quot;, &quot;டாஷ்போர்ட்&quot; to open hub pages.
      </p>
      {lastHeard && (
        <p className="mt-2 text-xs text-vh-muted truncate">Heard: {lastHeard}</p>
      )}
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "mt-3 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-[11px] font-semibold uppercase tracking-wider",
          listening ? "bg-red-100 text-red-700" : "bg-vh-blue text-white"
        )}
      >
        {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        {listening ? "Stop listening" : "Start Tamil voice"}
      </button>
    </div>
  );
}
