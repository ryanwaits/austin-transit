import { json, mock } from "../../_mock";

export function GET() {
  return json(mock.otp.summary);
}
