// Server-side data access for the essay. Reads the generated mock JSON directly
// (no fetch) so Server Components render without a running API. The browser-side
// pieces (map GeoJSON, subscribe) still go through api-client. When real data
// lands, this module is the one place to swap the source.
import otp from "@at/api/src/mocks/otp.json";
import type { EquityQuintile, OtpSummary, RouteOtp } from "./api-client";

export const summary = otp.summary as OtpSummary;
export const byRoute = otp.byRoute as RouteOtp[];
export const byEquityQuintile = otp.byEquityQuintile as EquityQuintile[];
