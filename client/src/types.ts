export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type BodyType = 'none' | 'raw' | 'urlencoded';

export interface KV {
  key: string;
  value: string;
}

export interface RequestTab {
  id: string;
  customName: string;
  method: HttpMethod;
  url: string;
  bodyType: BodyType;
  rawType: string;
  reqBody: string;
  reqParams: KV[];
  reqHeaders: KV[];
  reqUrlencoded: KV[];
  resBody: string;
  /** e.g. "000 WAITING", "SENDING...", "200 OK" */
  resStatus: string;
  /** css modifier: status-default | status-ok | status-err | status-warn */
  resStatusClass: string;
  resTime: string;
  resSize: string;
  resHeaders: KV[];
  sending: boolean;
}

export interface AuthUser {
  id: number;
  username: string;
}

export interface HistoryListItem {
  id: number;
  method: string;
  status_code: number;
  tab_name: string;
  url: string;
}

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

export interface ProxyResponse {
  statusCode: number;
  statusText: string;
  timeMs: number;
  sizeBytes: number;
  sizeText: string;
  body: string;
  headers: KV[];
}

export type PopupType = 'error' | 'success' | 'warning';
