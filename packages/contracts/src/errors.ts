import { z } from "zod"

export const apiErrorDetailsSchema = z.record(z.string(), z.unknown())

export const apiErrorSchema = z.strictObject({
  code: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  requestId: z.string().min(1).max(100),
  details: apiErrorDetailsSchema.optional(),
})

export const apiErrorResponseSchema = z.strictObject({
  error: apiErrorSchema,
})

export type ApiError = z.infer<typeof apiErrorSchema>
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>
