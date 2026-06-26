import { Hono } from "hono";
import { getOtpByEquityQuintile, getOtpByRoute, getOtpSummary } from "../data.ts";

// start/end query params are accepted (the real provider will use them); in
// MOCK_MODE they're ignored since the mock is a fixed snapshot.
export const otp = new Hono();

otp.get("/otp/summary", async (c) => c.json(await getOtpSummary()));
otp.get("/otp/by-route", async (c) => c.json(await getOtpByRoute()));
otp.get("/otp/by-equity-quintile", async (c) => c.json(await getOtpByEquityQuintile()));
