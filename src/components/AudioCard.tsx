import { useRef, useState, useEffect } from "react";
import Subtitles from "./Subtitles";

interface AudioCardProps {
  audioFile: string;
  subject: string;
  description: string;
  duration: number;
  currentlyPlaying: string | null;
  onPlay: (audioFile: string) => void;
  onTimeUpdate?: (audioFile: string, time: number) => void;
  autoPlayAt?: number;
  onAutoPlayComplete?: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function AudioCard({
  audioFile,
  subject,
  description,
  duration,
  currentlyPlaying,
  onPlay,
  onTimeUpdate,
  autoPlayAt,
  onAutoPlayComplete,
}: AudioCardProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);

  // Pause this audio if another one starts playing
  useEffect(() => {
    if (currentlyPlaying && currentlyPlaying !== audioFile && audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  }, [currentlyPlaying, audioFile]);

  // Reset hasAutoPlayed when autoPlayAt changes (new search result clicked)
  useEffect(() => {
    if (autoPlayAt !== undefined) {
      setHasAutoPlayed(false);
    }
  }, [autoPlayAt]);

  // Handle auto-play from shared link or search result
  useEffect(() => {
    if (autoPlayAt !== undefined && !hasAutoPlayed && audioRef.current && cardRef.current) {
      setHasAutoPlayed(true);
      
      // Scroll to this card
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      
      // Wait a moment for scroll, then set time and play
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = autoPlayAt;
          audioRef.current.play().catch((err) => {
            // Auto-play might be blocked by browser
            console.log("Auto-play blocked:", err);
          });
        }
        // Notify parent that auto-play has been handled
        onAutoPlayComplete?.();
      }, 500);
    }
  }, [autoPlayAt, hasAutoPlayed, onAutoPlayComplete]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(audioFile, time);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    onPlay(audioFile);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  return (
    <article 
      ref={cardRef}
      id={audioFile}
      className="bg-white rounded-lg border border-stone-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h2 
            className="text-xl text-stone-800 font-medium"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            {subject}
          </h2>
        </div>
        <span className="text-sm text-stone-400 tabular-nums">
          {formatDuration(duration)}
        </span>
      </div>
      
      <p className="text-stone-600 text-sm mb-5 leading-relaxed line-clamp-2">
        {description}
      </p>

      <audio
        ref={audioRef}
        src={`/audio/${audioFile}`}
        className="w-full h-10 rounded-lg"
        controls
        preload="none"
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        style={{
          filter: "sepia(20%) saturate(70%) hue-rotate(330deg)",
        }}
      />

      <Subtitles
        audioFile={audioFile}
        currentTime={currentTime}
        isPlaying={isPlaying}
      />
    </article>
  );
}
