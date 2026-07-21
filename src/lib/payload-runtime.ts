export const isPayloadConfigured = Boolean(
  process.env.DATABASE_URL?.trim() && process.env.PAYLOAD_SECRET?.trim(),
)
