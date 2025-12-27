import { useEffect, useState } from "react";

interface Word {
  word: string;
  start: number;
  end: number;
}

interface SubtitlesProps {
  audioFile: string;
  currentTime: number;
  isPlaying: boolean;
}

export default function Subtitles({ audioFile, currentTime, isPlaying }: SubtitlesProps) {
  const [words, setWords] = useState<Word[]>([]);
  const [startTimeOffset, setStartTimeOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPlaying || words.length > 0) return;

    const fetchTranscript = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/segments/${encodeURIComponent(audioFile)}/transcript`);
        if (!response.ok) {
          throw new Error("Failed to fetch transcript");
        }
        const data = await response.json();
        // Store the startTime offset - word timestamps are absolute to the original recording
        setStartTimeOffset(data.startTime || 0);
        // Filter out whitespace-only entries and ellipsis - they have their own timestamps
        // which can cause highlighting issues
        const filteredWords = data.transcript.words.filter(
          (w: Word) => w.word.trim() !== "" && w.word !== "..."
        );
        setWords(filteredWords);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchTranscript();
  }, [audioFile, isPlaying, words.length]);


  if (!isPlaying && words.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="mt-5 p-4 bg-stone-50 rounded-lg text-stone-400 text-center italic text-sm border border-stone-100">
        Loading transcript...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-5 p-4 bg-red-50 rounded-lg text-red-600 text-center text-sm border border-red-100">
        {error}
      </div>
    );
  }

  if (words.length === 0) {
    return null;
  }

  // Adjust currentTime by adding the segment's startTime offset
  // Word timestamps are absolute to the original recording, not relative to the segment mp3
  const adjustedTime = currentTime + startTimeOffset;

  // Find the current word index based on playback time
  // Use a more robust algorithm that finds the closest word even if adjustedTime
  // falls in a gap between words
  let currentWordIndex = -1;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    // Exact match - adjustedTime is within word boundaries
    if (adjustedTime >= word.start && adjustedTime <= word.end) {
      currentWordIndex = i;
      break;
    }
    // Check if we're in a gap between this word and the next
    if (i < words.length - 1) {
      const nextWord = words[i + 1];
      if (adjustedTime > word.end && adjustedTime < nextWord.start) {
        // In a gap - use the previous word
        currentWordIndex = i;
        break;
      }
    }
    // If adjustedTime is before the first word
    if (i === 0 && adjustedTime < word.start) {
      currentWordIndex = 0;
      break;
    }
    // If we've passed this word, it might be the current one (for last word case)
    if (adjustedTime >= word.start) {
      currentWordIndex = i;
    }
  }

  // Show 5 words at a time - calculate which chunk we're in
  const chunkSize = 5;
  const currentChunk = Math.floor(Math.max(0, currentWordIndex) / chunkSize);
  const chunkStart = currentChunk * chunkSize;
  const chunkEnd = Math.min(chunkStart + chunkSize, words.length);
  const visibleWords = words.slice(chunkStart, chunkEnd);

  return (
    <div className="mt-5 p-4 bg-stone-50 rounded-lg border border-stone-100">
      <p className="text-stone-700 leading-relaxed text-lg text-center">
        {visibleWords.map((word, index) => {
          const globalIndex = chunkStart + index;
          const isActive = globalIndex === currentWordIndex;
          const isPast = globalIndex < currentWordIndex;

          return (
            <span key={`${globalIndex}-${word.start}`}>
              <span
                className={`transition-colors duration-150 ${
                  isActive
                    ? "text-amber-700 font-medium bg-amber-100 rounded px-1"
                    : isPast
                    ? "text-stone-400"
                    : "text-stone-600"
                }`}
              >
                {word.word}
              </span>
              {index < visibleWords.length - 1 && " "}
            </span>
          );
        })}
      </p>
    </div>
  );
}
