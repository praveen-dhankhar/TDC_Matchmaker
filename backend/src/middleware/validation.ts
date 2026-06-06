import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const createNoteSchema = z.object({
  body: z
    .string()
    .min(1, 'Note body cannot be empty')
    .max(1000, 'Note body cannot exceed 1000 characters'),
});

export const updateStatusSchema = z.object({
  status: z.enum(['New Lead', 'In Progress', 'Matched', 'On Hold', 'Closed'], {
    errorMap: () => ({
      message: 'Status must be one of: New Lead, In Progress, Matched, On Hold, Closed',
    }),
  }),
});

export const sendMatchSchema = z.object({
  candidateId: z.string().min(1, 'Candidate ID is required'),
});

export const matchQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().min(1).max(20)),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type SendMatchInput = z.infer<typeof sendMatchSchema>;
