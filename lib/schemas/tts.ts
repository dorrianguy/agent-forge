/**
 * Zod schemas for TTS (Text-to-Speech) input validation.
 */

import { z } from 'zod';

export const VALID_VOICES = [
  'alloy',
  'echo',
  'fable',
  'nova',
  'onyx',
  'shimmer',
  'rachel',
  'adam',
  'bella',
] as const;

export type Voice = (typeof VALID_VOICES)[number];

export const VoiceSchema = z.enum(VALID_VOICES);

/**
 * Build the TTS input schema.
 *
 * The max text length depends on whether the caller is authenticated
 * (4096 chars) or anonymous (500 chars).
 */
export function buildTTSInputSchema(isAuthenticated: boolean) {
  const maxLength = isAuthenticated ? 4096 : 500;
  const lengthMessage = isAuthenticated
    ? `Text must be ${maxLength} characters or less`
    : `Text must be ${maxLength} characters or less for anonymous users. Sign in for up to 4096 characters.`;

  return z.object({
    text: z
      .string()
      .min(1, 'Text cannot be empty')
      .max(maxLength, lengthMessage)
      .transform((v) => v.trim()),
    voice: z
      .string()
      .transform((v) => v.toLowerCase())
      .pipe(VoiceSchema)
      .optional()
      .nullable(),
    speed: z.number().min(0.25).max(4.0).optional().nullable(),
  });
}

export type TTSInput = z.infer<ReturnType<typeof buildTTSInputSchema>>;
