import { z } from "zod";

const createJobs = z.object({
  name: z
    .string()
    .trim()
    .min(3, "project name must be of atleast 3 characters")
    .max(50, "project name must be of atmost 50 characters"),
  url: z
    .string()
    .trim()
    .url("please enter a valid URL."),
  
  intervalSeconds: z
    .number()
    .int()
    .refine(
      (value) => [30, 60, 300].includes(value),
      "Interval must be of 30, 60 or 300 seconds."
    ),
});

module.exports = { name, url, intervalSeconds } 
