import { useState } from "react";

interface ShareButtonProps {
  audioFile: string | null;
  currentTime: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function ShareButton({ audioFile, currentTime }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  if (!audioFile) {
    return null;
  }

  const handleShare = async () => {
    const timestamp = Math.floor(currentTime);
    const url = `${window.location.origin}${window.location.pathname}?audio=${encodeURIComponent(audioFile)}&t=${timestamp}`;
    
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="fixed bottom-6 right-6 bg-stone-800 text-white px-4 py-3 rounded-full shadow-lg hover:bg-stone-700 transition-all duration-200 flex items-center gap-2 z-50"
      style={{ fontFamily: "var(--font-source-serif), Georgia, serif" }}
    >
      {copied ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>Link copied!</span>
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
          </svg>
          <span>Share at {formatTime(currentTime)}</span>
        </>
      )}
    </button>
  );
}

