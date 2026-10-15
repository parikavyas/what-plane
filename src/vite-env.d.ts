/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the feed relay (relay/worker.js), e.g. https://what-plane-relay.you.workers.dev */
  readonly VITE_FEED_RELAY?: string;
}
