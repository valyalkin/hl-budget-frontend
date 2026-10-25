import type { Instrumentation } from 'next';

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  // Only the Node runtime has stdout; this app runs nothing on the edge.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { reportError, toErrorReport } =
    await import('@/app/lib/observability');
  reportError(toErrorReport(error, request, context));
};
