import GtfsRealtimeBindings from "gtfs-realtime-bindings";

const { FeedMessage } = GtfsRealtimeBindings.transit_realtime;

export class FeedFetchError extends Error {
  constructor(
    public readonly url: string,
    public readonly status: number,
  ) {
    super(`feed fetch failed: ${status} ${url}`);
    this.name = "FeedFetchError";
  }
}

// Plain-object view of a decoded feed. We convert protobuf enums to their
// string names and 64-bit fields to JS numbers so downstream writers and the
// `raw` JSONB column hold readable values.
export interface FeedObject {
  header?: { timestamp?: number };
  entity: FeedEntity[];
}

export interface FeedEntity {
  id?: string;
  vehicle?: Record<string, unknown>;
  tripUpdate?: Record<string, unknown>;
}

export interface FetchedFeed {
  feed: FeedObject;
  /** The original protobuf bytes, kept for archiving to R2 (forensic record). */
  bytes: Uint8Array;
}

/**
 * Fetch a GTFS-RT protobuf feed and decode it to a plain object, also returning
 * the original bytes so the caller can archive them. Throws FeedFetchError on a
 * non-2xx response so the caller can log the status and keep the poll loop alive.
 */
export async function fetchFeed(url: string): Promise<FetchedFeed> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new FeedFetchError(url, res.status);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const message = FeedMessage.decode(bytes);
  const feed = FeedMessage.toObject(message, {
    enums: String,
    longs: Number,
    defaults: false,
    arrays: true,
  }) as FeedObject;
  return { feed, bytes };
}
