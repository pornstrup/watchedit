export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
}

export const onRequestError = async (err: unknown) => {
  const { captureException } = await import('@sentry/nextjs')
  captureException(err)
}
