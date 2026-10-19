import { EventEmitter } from "node:events";

export interface PipelineEvent {
  analysisId: string;
  stage: string;
  message: string;
  status: "queued" | "parsing" | "complete" | "failed";
  error?: string;
  repoOwner?: string;
  repoName?: string;
  timestamp: string;
}

class PipelineBroker extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  publish(event: PipelineEvent) {
    this.emit(`analysis:${event.analysisId}`, event);
    this.emit("global", event);
  }

  subscribe(analysisId: string, listener: (event: PipelineEvent) => void): () => void {
    const channel = `analysis:${analysisId}`;
    this.on(channel, listener);
    return () => {
      this.off(channel, listener);
    };
  }

  subscribeGlobal(listener: (event: PipelineEvent) => void): () => void {
    this.on("global", listener);
    return () => {
      this.off("global", listener);
    };
  }
}

// Global broker singleton across Next.js server invocations
const globalForBroker = globalThis as unknown as { __cartographBroker?: PipelineBroker };
export const broker = globalForBroker.__cartographBroker ?? new PipelineBroker();
if (process.env.NODE_ENV !== "production") {
  globalForBroker.__cartographBroker = broker;
}
