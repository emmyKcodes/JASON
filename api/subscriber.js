export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    const API_KEY = process.env.MAILCHIMP_API_KEY;
    const AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;

    if (!API_KEY || !AUDIENCE_ID) {
      console.error("Missing environment variables");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const DATACENTER = API_KEY.split("-")[1];

    const response = await fetch(
      `https://${DATACENTER}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}/members`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`anystring:${API_KEY}`).toString(
            "base64"
          )}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: email,
          status: "subscribed",
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      return res.status(200).json({
        success: true,
        message: "Successfully subscribed!",
      });
    } else {
      console.error("Mailchimp error:", data);

      // Handle specific Mailchimp errors
      if (data.title === "Member Exists") {
        return res.status(400).json({
          success: false,
          error: "This email is already subscribed to our waitlist!",
        });
      } else if (data.title === "Invalid Resource") {
        return res.status(400).json({
          success: false,
          error: "Invalid email address",
        });
      } else {
        return res.status(400).json({
          success: false,
          error: data.detail || "Subscription failed",
        });
      }
    }
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}
