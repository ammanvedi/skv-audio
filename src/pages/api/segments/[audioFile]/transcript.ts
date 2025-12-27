import type { NextApiRequest, NextApiResponse } from "next";
import { getTranscriptByAudioFile, Transcript } from "@/lib/manifest";

type ResponseData = {
  transcript: Transcript;
  startTime: number;
};

type ErrorResponse = {
  error: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | ErrorResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { audioFile } = req.query;

  if (!audioFile || typeof audioFile !== "string") {
    return res.status(400).json({ error: "Audio file parameter is required" });
  }

  try {
    const result = getTranscriptByAudioFile(audioFile);

    if (!result) {
      return res.status(404).json({ error: "Transcript not found" });
    }

    res.status(200).json({ 
      transcript: result.transcript,
      startTime: result.startTime,
    });
  } catch (error) {
    console.error("Error fetching transcript:", error);
    res.status(500).json({ error: "Failed to fetch transcript" });
  }
}

