import type { NextApiRequest, NextApiResponse } from "next";
import { getAllSegments, SegmentWithSession } from "@/lib/manifest";

type ResponseData = {
  segments: SegmentWithSession[];
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

  try {
    const segments = getAllSegments();
    res.status(200).json({ segments });
  } catch (error) {
    console.error("Error fetching segments:", error);
    res.status(500).json({ error: "Failed to fetch segments" });
  }
}

