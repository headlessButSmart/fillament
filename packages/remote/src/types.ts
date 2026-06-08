export interface RemoteContext<TValues = unknown> {
  values: TValues;
  signal: AbortSignal;
}

export interface RemoteValidationContext<TValues = unknown> {
  value: unknown;
  values: TValues;
  field: string;
  signal: AbortSignal;
}

export interface RemoteOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface RemoteOptionsConfig<TValues = unknown, TResult = unknown> {
  key: unknown[] | ((ctx: { values: TValues }) => unknown[]);
  fetcher: (ctx: RemoteContext<TValues>) => Promise<TResult>;
  enabled?: boolean | ((ctx: { values: TValues }) => boolean);
  debounceMs?: number;
  cacheTimeMs?: number;
  staleTimeMs?: number;
  mapOption?: (item: any) => RemoteOption;
  onError?: (error: unknown) => void;
}

export interface RemoteValidationConfig<TValues = unknown> {
  debounceMs?: number;
  fetcher: (
    ctx: RemoteValidationContext<TValues>
  ) => Promise<string | undefined | null | boolean>;
  onError?: (error: unknown) => string | undefined;
}

export interface RemoteDefaultValueConfig<TValues = unknown, TResult = unknown> {
  key: unknown[] | ((ctx: { values: TValues }) => unknown[]);
  fetcher: (ctx: RemoteContext<TValues>) => Promise<TResult>;
  enabled?: boolean | ((ctx: { values: TValues }) => boolean);
  onError?: (error: unknown) => void;
}

export type RemoteStatus = "idle" | "loading" | "success" | "error";

export interface RemoteResultSnapshot<TData> {
  status: RemoteStatus;
  data: TData | undefined;
  error: unknown;
  isStale: boolean;
}

export interface RemoteResultHandle<TData> {
  /** Read the current snapshot synchronously. */
  getSnapshot(): RemoteResultSnapshot<TData>;
  /** Subscribe to snapshot changes; returns unsubscribe. */
  subscribe(listener: () => void): () => void;
  /** Manually trigger a refresh (bypasses staleTime). */
  refetch(values: unknown): Promise<void>;
  /** Forward a new values reference; triggers a fetch if key changed and enabled. */
  update(values: unknown): void;
  /** Cancel any pending fetch and remove listeners. */
  dispose(): void;
}
