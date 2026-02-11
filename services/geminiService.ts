import { supabase } from "../lib/supabase";

export const rateProofText = async (proofText: string): Promise<number> => {
  // Updated function target to 'axis-ai' to match the directory structure and file provided in the ledger.
  const { data, error } = await supabase.functions.invoke("axis-ai", {
    body: {
      prompt: `Rate the following proof from 1 to 5. Return only the digit.\n${proofText}`,
    },
  });

  if (error) return 3;

  const rating = parseInt(data?.text ?? "3");
  return isNaN(rating) ? 3 : Math.min(Math.max(rating, 1), 5);
};
