export interface KeyValue {
  key: string;
  value: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type BodyType = 'none' | 'raw' | 'urlencoded';

/** Payload the client sends to POST /api/request (the server-side "cloud" send path). */
export interface ProxyRequestBody {
  method: HttpMethod;
  url: string;
  tabName?: string;
  saveHistory?: boolean;
  bodyType: BodyType;
  rawType: string;
  body: string;
  params: KeyValue[];
  headers: KeyValue[];
  urlencoded: KeyValue[];
}

export interface ProxyResponse {
  statusCode: number;
  statusText: string;
  timeMs: number;
  sizeBytes: number;
  sizeText: string;
  body: string;
  headers: KeyValue[];
}

/** Row shape returned by GET /api/history (list). */
export interface HistoryListItem {
  id: number;
  method: string;
  status_code: number;
  tab_name: string;
  url: string;
}

/** Row shape returned by GET /api/history/:id (full record for re-opening a tab). */
export interface HistoryRecord {
  tab_name: string;
  method: string;
  url: string;
  body_type: string;
  raw_type: string;
  req_body: string;
  req_params: string;
  req_headers: string;
  req_urlencoded: string;
}

/** Payload for POST /api/history (used after a Local Agent request completes in the browser). */
export interface SaveHistoryBody {
  method: string;
  url: string;
  tabName?: string;
  bodyType: string;
  rawType: string;
  body: string;
  params: KeyValue[];
  headers: KeyValue[];
  urlencoded: KeyValue[];
  statusCode: number;
}

export interface SessionUser {
  id: number;
  username: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}
