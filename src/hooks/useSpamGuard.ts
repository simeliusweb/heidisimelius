import { useCallback, useEffect, useId, useRef } from "react";
import type { InputHTMLAttributes, RefObject } from "react";

/** Extra fields sent with the form POST so /api/send-email can filter bots. */
export interface SpamFields {
  /** Honeypot value – must stay empty for humans. JSON key expected by the server. */
  website: string;
  /** Milliseconds since the form was mounted (or last successfully reset). */
  elapsedMs: number;
}

type HoneypotInputProps = InputHTMLAttributes<HTMLInputElement> & {
  ref: RefObject<HTMLInputElement>;
  // Ask password managers (1Password, LastPass, Dashlane) to leave the field alone
  "data-1p-ignore": boolean;
  "data-lpignore": string;
  "data-form-type": string;
};

interface SpamGuard {
  /** Spread onto the hidden honeypot <input>; use `honeypotProps.id` for the label. */
  honeypotProps: HoneypotInputProps;
  /** Read at submit time and merge into the JSON body. */
  getSpamFields: () => SpamFields;
  /** Call after a successful form.reset() to restart the timer and clear the honeypot. */
  resetSpamGuard: () => void;
}

/**
 * Honeypot + time-trap for public forms. The honeypot input deliberately uses a
 * neutral name (not "website") so browser autofill doesn't fill it for real users;
 * its value is still sent to the server under the `website` key.
 */
const useSpamGuard = (): SpamGuard => {
  const honeypotRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<number>(0);
  const id = useId();

  useEffect(() => {
    startRef.current = Date.now();
  }, []);

  const getSpamFields = useCallback(
    (): SpamFields => ({
      website: honeypotRef.current?.value ?? "",
      elapsedMs: Date.now() - startRef.current,
    }),
    []
  );

  const resetSpamGuard = useCallback(() => {
    startRef.current = Date.now();
    if (honeypotRef.current) {
      honeypotRef.current.value = "";
    }
  }, []);

  return {
    honeypotProps: {
      ref: honeypotRef,
      id: `hs-extra-${id}`,
      name: "hs_extra",
      type: "text",
      tabIndex: -1,
      autoComplete: "off",
      "data-1p-ignore": true,
      "data-lpignore": "true",
      "data-form-type": "other",
    },
    getSpamFields,
    resetSpamGuard,
  };
};

export default useSpamGuard;
