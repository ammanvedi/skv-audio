import type { NextApiRequest, NextApiResponse } from "next";

const SITE_PASSWORD = "countdown";

type ResponseData = {
  success: boolean;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false });
  }

  const { password } = req.body;

  if (password === SITE_PASSWORD) {
    res.status(200).json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
}

