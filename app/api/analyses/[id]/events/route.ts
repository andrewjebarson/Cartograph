import { getAnalysis } from "@/lib/db";
import { broker, type PipelineEvent } from "@/lib/pipeline/events";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: PipelineEvent | { stage: string; message: string; status: string; error?: string }) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Stream might be closed
        }
      };

      // Send initial state from DB
      const current = getAnalysis(id);
      if (current) {
        send({
          stage: current.stage || current.status,
          message: current.stage_message || "",
          status: current.status,
          error: current.error_message || undefined,
        });

        if (current.status === "complete" || current.status === "failed") {
          controller.close();
          return;
        }
      }

      // Subscribe to live events
      const unsubscribe = broker.subscribe(id, (event) => {
        send(event);
        if (event.status === "complete" || event.status === "failed") {
          unsubscribe();
          try {
            controller.close();
          } catch {
            // ignore
          }
        }
      });

      // Cleanup on client abort
      request.signal.addEventListener("abort", () => {
        unsubscribe();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
