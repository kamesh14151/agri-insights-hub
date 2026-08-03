/**
 * Application Error Reporting & Telemetry
 * Built for Agrisynapse by AJ STUDIOZ
 */

type AppErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

export function reportAppError(error: unknown, context: Record<string, unknown> = {}, options?: AppErrorOptions) {
  if (typeof window === "undefined") return;
  
  if (process.env.NODE_ENV === "development") {
    console.error("[AJ STUDIOZ Error Logger]", {
      error,
      route: window.location.pathname,
      ...context,
      options,
    });
  }
}

// Backward compatibility alias
export const reportLovableError = reportAppError;
