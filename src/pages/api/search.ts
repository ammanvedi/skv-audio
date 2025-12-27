import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";
import { getManifest, Segment } from "@/lib/manifest";

interface SearchResult {
  audioFile: string;
  timestamp: number;
  subject: string;
  quote: string;
}

interface GeminiMatch {
  audioFile: string;
  quote: string;
  subject: string;
}

type ResponseData = {
  results: SearchResult[];
};

type ErrorResponse = {
  error: string;
};

// Check if a quote exists in a segment's transcript and return the timestamp if found
function findQuoteInSegment(
  segment: Segment,
  quote: string
): { found: boolean; timestamp: number } {
  const words = segment.transcript.words;
  if (!words || words.length === 0) {
    // Fallback: check if quote exists in the text
    const textLower = segment.transcript.text.toLowerCase();
    const quoteLower = quote.toLowerCase();
    if (textLower.includes(quoteLower)) {
      return { found: true, timestamp: 0 };
    }
    return { found: false, timestamp: 0 };
  }

  // Clean up the quote for matching
  const cleanQuote = quote.toLowerCase().replace(/[^\w\s]/g, "").trim();
  const quoteWords = cleanQuote.split(/\s+/).filter(w => w.length > 0);
  
  if (quoteWords.length === 0) {
    return { found: false, timestamp: 0 };
  }

  // Search for the first word of the quote in the transcript words
  const firstQuoteWord = quoteWords[0];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const cleanWord = word.word.toLowerCase().replace(/[^\w\s]/g, "").trim();
    
    if (cleanWord === firstQuoteWord || cleanWord.includes(firstQuoteWord)) {
      // Found a potential match - verify with next few words
      let matchCount = 1;
      const wordsToCheck = Math.min(quoteWords.length, 5);
      
      for (let j = 1; j < wordsToCheck; j++) {
        if (i + j < words.length) {
          const nextWord = words[i + j].word.toLowerCase().replace(/[^\w\s]/g, "").trim();
          if (nextWord === quoteWords[j] || nextWord.includes(quoteWords[j]) || quoteWords[j].includes(nextWord)) {
            matchCount++;
          }
        }
      }
      
      // If we matched at least 60% of the checked words, consider it a match
      if (matchCount >= wordsToCheck * 0.6) {
        // Return timestamp relative to segment start
        const absoluteTime = word.start;
        const relativeTime = absoluteTime - segment.metadata.startTime;
        return { found: true, timestamp: Math.max(0, relativeTime) };
      }
    }
  }

  return { found: false, timestamp: 0 };
}

// Find which segment actually contains a quote
function findSegmentForQuote(
  segments: Map<string, Segment>,
  quote: string
): { segment: Segment; timestamp: number } | null {
  for (const segment of segments.values()) {
    const result = findQuoteInSegment(segment, quote);
    if (result.found) {
      return { segment, timestamp: result.timestamp };
    }
  }
  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { question } = req.body;

  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "Question is required" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  try {
    const manifest = getManifest();

    // Build a map of audioFile -> segment for quick lookup
    const segmentMap = new Map<string, Segment>();
    manifest.sessions.forEach((session) => {
      session.segments.forEach((segment) => {
        segmentMap.set(segment.audioFile, segment);
      });
    });

    // Build condensed transcript data for Gemini (without word timestamps)
    const transcriptData = manifest.sessions.flatMap((session) =>
      session.segments.map((segment) => ({
        audioFile: segment.audioFile,
        subject: segment.metadata.subject,
        description: segment.metadata.description,
        text: segment.transcript.text,
      }))
    );

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are analyzing audio transcripts from conversations with an elderly person named "Dada" or "S.K. Vedi". 
Given the following transcripts, find ALL moments where the user's question/topic is discussed.

IMPORTANT: Return ONLY a valid JSON array with no markdown formatting, no code blocks, no explanation.
Each match should have these exact fields:
- audioFile: the audio file name exactly as shown (string)
- subject: the segment's subject exactly as shown (string)
- quote: copy an EXACT phrase from the transcript where the topic is discussed, 5-15 words, must be verbatim from the text (string)

CRITICAL: Make sure the quote you return is actually from the audioFile you specify. Do not mix up quotes between different segments.

If no matches are found, return an empty array: []

Transcripts:
${JSON.stringify(transcriptData, null, 2)}

User's question: ${question}

Return ONLY the JSON array:`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    });

    const responseText = response.text || "[]";
    
    // Clean up the response - remove markdown code blocks if present
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.slice(7);
    } else if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith("```")) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }
    cleanedResponse = cleanedResponse.trim();

    let geminiMatches: GeminiMatch[] = [];
    try {
      geminiMatches = JSON.parse(cleanedResponse);
      if (!Array.isArray(geminiMatches)) {
        geminiMatches = [];
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", cleanedResponse);
      geminiMatches = [];
    }

    // Validate and correct each match - ensure quote is actually in the claimed segment
    const results: SearchResult[] = [];
    
    for (const match of geminiMatches) {
      const claimedSegment = segmentMap.get(match.audioFile);
      
      if (claimedSegment) {
        // First, check if the quote is actually in the claimed segment
        const checkResult = findQuoteInSegment(claimedSegment, match.quote);
        
        if (checkResult.found) {
          // Quote is in the correct segment
          results.push({
            audioFile: match.audioFile,
            timestamp: checkResult.timestamp,
            subject: claimedSegment.metadata.subject,
            quote: match.quote,
          });
        } else {
          // Quote is NOT in the claimed segment - search all segments to find the correct one
          const correctMatch = findSegmentForQuote(segmentMap, match.quote);
          
          if (correctMatch) {
            results.push({
              audioFile: correctMatch.segment.audioFile,
              timestamp: correctMatch.timestamp,
              subject: correctMatch.segment.metadata.subject,
              quote: match.quote,
            });
          }
          // If we can't find the quote anywhere, skip this result
        }
      } else {
        // audioFile doesn't exist - try to find the quote in any segment
        const correctMatch = findSegmentForQuote(segmentMap, match.quote);
        
        if (correctMatch) {
          results.push({
            audioFile: correctMatch.segment.audioFile,
            timestamp: correctMatch.timestamp,
            subject: correctMatch.segment.metadata.subject,
            quote: match.quote,
          });
        }
      }
    }

    // Remove duplicates (same audioFile and similar timestamp)
    const uniqueResults = results.filter((result, index, self) =>
      index === self.findIndex((r) => 
        r.audioFile === result.audioFile && 
        Math.abs(r.timestamp - result.timestamp) < 10
      )
    );

    res.status(200).json({ results: uniqueResults });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Failed to search transcripts" });
  }
}
