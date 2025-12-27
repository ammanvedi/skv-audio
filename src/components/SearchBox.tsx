import { useState } from "react";

interface SearchResult {
  audioFile: string;
  timestamp: number;
  subject: string;
  quote: string;
}

interface SearchBoxProps {
  onResultClick: (audioFile: string, timestamp: number) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function SearchBox({ onResultClick }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    onResultClick(result.audioFile, result.timestamp);
    // Scroll to the audio card
    const element = document.getElementById(result.audioFile);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="mb-10">
      <form onSubmit={handleSearch} className="flex flex-col gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about topics discussed... e.g., 'Where did Dada talk about reincarnation?'"
          className="w-full px-4 py-3 border border-stone-300 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-base"
          style={{ fontFamily: "var(--font-source-serif), Georgia, serif" }}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="w-full px-6 py-3 bg-stone-800 text-white rounded-lg hover:bg-stone-700 disabled:bg-stone-400 disabled:cursor-not-allowed transition-colors"
          style={{ fontFamily: "var(--font-source-serif), Georgia, serif" }}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-6 text-center text-stone-500 italic">
          Analyzing transcripts with AI...
        </div>
      )}

      {!loading && hasSearched && results.length === 0 && !error && (
        <div className="mt-6 text-center text-stone-500 italic">
          No matching moments found. Try a different question.
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm text-stone-500 uppercase tracking-widest mb-4">
            {results.length} moment{results.length !== 1 ? "s" : ""} found
          </h3>
          <div className="space-y-3">
            {results.map((result, index) => (
              <button
                key={`${result.audioFile}-${result.timestamp}-${index}`}
                onClick={() => handleResultClick(result)}
                className="w-full text-left p-4 bg-white border border-stone-200 rounded-lg hover:border-amber-400 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 
                      className="text-stone-800 font-medium group-hover:text-amber-700 transition-colors"
                      style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
                    >
                      {result.subject}
                    </h4>
                    <p className="text-stone-600 text-sm mt-1 italic line-clamp-2">
                      &ldquo;{result.quote}&rdquo;
                    </p>
                  </div>
                  <span className="text-sm text-stone-400 tabular-nums ml-4 shrink-0">
                    {formatTime(result.timestamp)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

