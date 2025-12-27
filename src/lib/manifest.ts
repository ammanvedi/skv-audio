import fs from "fs";
import path from "path";

export interface Word {
  word: string;
  start: number;
  end: number;
}

export interface Transcript {
  text: string;
  words: Word[];
}

export interface SegmentMetadata {
  subject: string;
  description: string;
  segmentIndex: number;
  duration: number;
  startTime: number;
  endTime: number;
}

export interface Segment {
  audioFile: string;
  metadata: SegmentMetadata;
  transcript: Transcript;
}

export interface Session {
  sessionId: string;
  totalDuration: number;
  totalWords: number;
  segments: Segment[];
}

export interface Manifest {
  createdAt: string;
  totalSessions: number;
  sessions: Session[];
}

// Cache the parsed manifest in memory
let cachedManifest: Manifest | null = null;

export function getManifest(): Manifest {
  if (cachedManifest) {
    return cachedManifest;
  }

  const manifestPath = path.join(process.cwd(), "public", "audio", "manifest.json");
  const fileContents = fs.readFileSync(manifestPath, "utf-8");
  cachedManifest = JSON.parse(fileContents) as Manifest;
  
  return cachedManifest;
}

export interface SegmentWithSession {
  audioFile: string;
  sessionId: string;
  subject: string;
  description: string;
  duration: number;
  segmentIndex: number;
}

export function getAllSegments(): SegmentWithSession[] {
  const manifest = getManifest();
  const segments: SegmentWithSession[] = [];

  for (const session of manifest.sessions) {
    for (const segment of session.segments) {
      segments.push({
        audioFile: segment.audioFile,
        sessionId: session.sessionId,
        subject: segment.metadata.subject,
        description: segment.metadata.description,
        duration: segment.metadata.duration,
        segmentIndex: segment.metadata.segmentIndex,
      });
    }
  }

  return segments;
}

export interface TranscriptWithOffset {
  transcript: Transcript;
  startTime: number;
}

export function getTranscriptByAudioFile(audioFile: string): TranscriptWithOffset | null {
  const manifest = getManifest();

  for (const session of manifest.sessions) {
    for (const segment of session.segments) {
      if (segment.audioFile === audioFile) {
        return {
          transcript: segment.transcript,
          startTime: segment.metadata.startTime,
        };
      }
    }
  }

  return null;
}

