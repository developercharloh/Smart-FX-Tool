import { Router } from "express";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const response = await fetch(
      "https://nfs.faireconomy.media/ff_calendar_thisweek.json?timezone=UTC",
      {
        headers: { "User-Agent": "SmartFX/1.0" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = await response.json();
    res.setHeader("Cache-Control", "public, max-age=900");
    res.json(data);
  } catch {
    res.json(getFallbackCalendar());
  }
});

function getFallbackCalendar() {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  return [
    { title: "USD Non-Farm Payrolls",  country: "USD", date: today, time: "12:30:00", impact: "High",   forecast: "200K", previous: "187K" },
    { title: "EUR ECB Interest Rate",  country: "EUR", date: today, time: "13:45:00", impact: "High",   forecast: "4.50%", previous: "4.50%" },
    { title: "GBP CPI y/y",           country: "GBP", date: today, time: "07:00:00", impact: "High",   forecast: "3.2%",  previous: "3.4%" },
    { title: "USD Initial Jobless Claims", country: "USD", date: today, time: "12:30:00", impact: "Medium", forecast: "215K", previous: "220K" },
    { title: "USD FOMC Meeting Minutes", country: "USD", date: today, time: "18:00:00", impact: "High",  forecast: "--",    previous: "--" },
  ];
}

export default router;
