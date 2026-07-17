import { z } from "zod";

export const updatePingJobSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .optional(),

  url: z
    .string()
    .trim()
    .url()
    .optional(),

  intervalSeconds: z
    .number()
    .int()
    .refine(
      (value) => [30, 60, 300].includes(value),
      "Inteval must be of 30, 60 or 300 seconds."
    )
    .optional(),
});

export type UpdatePingJobInput = z.infer<typeof updatePingJobSchema>;