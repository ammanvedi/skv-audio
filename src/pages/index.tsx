import Head from "next/head";
import { Playfair_Display, Source_Serif_4 } from "next/font/google";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AudioCard from "@/components/AudioCard";
import ShareButton from "@/components/ShareButton";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

interface Segment {
  audioFile: string;
  sessionId: string;
  subject: string;
  description: string;
  duration: number;
  segmentIndex: number;
}

export default function Home() {
  const router = useRouter();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  
  // Parse URL params for auto-play
  const autoPlayAudio = router.query.audio as string | undefined;
  const autoPlayTime = router.query.t ? parseFloat(router.query.t as string) : undefined;

  useEffect(() => {
    const fetchSegments = async () => {
      try {
        const response = await fetch("/api/segments");
        if (!response.ok) {
          throw new Error("Failed to fetch segments");
        }
        const data = await response.json();
        setSegments(data.segments);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchSegments();
  }, []);

  // Clear URL params after auto-play is triggered
  useEffect(() => {
    if (autoPlayAudio && !loading && segments.length > 0) {
      // Clear the URL params without triggering a reload
      const url = new URL(window.location.href);
      url.searchParams.delete("audio");
      url.searchParams.delete("t");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [autoPlayAudio, loading, segments.length]);

  const handleTimeUpdate = (audioFile: string, time: number) => {
    if (audioFile === currentlyPlaying) {
      setCurrentPlaybackTime(time);
    }
  };

  return (
    <>
      <Head>
        <title>Stories from the Life of S. K. Vedi</title>
        <meta name="description" content="A collection of conversations, memories, and reflections from the life of S. K. Vedi" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div
        className={`${playfair.variable} ${sourceSerif.variable} min-h-screen bg-stone-50`}
        style={{ fontFamily: "var(--font-source-serif), Georgia, serif" }}
      >
        <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-8 py-6">
            <h1 
              className="text-3xl font-medium text-stone-800 tracking-tight"
              style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
            >
              Stories from the Life of S. K. Vedi
            </h1>
            <p className="text-sm text-stone-500 mt-1 italic">
              A collection of conversations, memories, and reflections
            </p>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-8 py-12">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-stone-400 italic">Loading collection...</div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-center">
              {error}
            </div>
          )}

          {!loading && !error && segments.length === 0 && (
            <div className="text-center py-20 text-stone-400 italic">
              No recordings found.
            </div>
          )}

          {!loading && !error && segments.length > 0 && (
            <>
              <div className="mb-8 text-sm text-stone-500 uppercase tracking-widest">
                {segments.length} recordings
              </div>
              <div className="space-y-6">
                {segments.map((segment) => (
                  <AudioCard
                    key={segment.audioFile}
                    audioFile={segment.audioFile}
                    subject={segment.subject}
                    description={segment.description}
                    duration={segment.duration}
                    currentlyPlaying={currentlyPlaying}
                    onPlay={setCurrentlyPlaying}
                    onTimeUpdate={handleTimeUpdate}
                    autoPlayAt={segment.audioFile === autoPlayAudio ? autoPlayTime : undefined}
                  />
                ))}
              </div>
            </>
          )}
        </main>

        <footer className="border-t border-stone-200 mt-16">
          <div className="max-w-5xl mx-auto px-8 py-8 text-center text-sm text-stone-400 italic">
            In loving memory
          </div>
        </footer>

        <ShareButton 
          audioFile={currentlyPlaying} 
          currentTime={currentPlaybackTime} 
        />
      </div>
    </>
  );
}
