import { SIBI_ALPHABETS } from "../data/alphabets.js";
import { supabase, isSupabaseConfigured } from "../config/supabase.js";

export const getAlphabets = async (req, res) => {
  try {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("sibi_alphabets")
        .select("*")
        .order("letter", { ascending: true });

      if (!error && data && data.length > 0) {
        return res.json({
          success: true,
          source: "supabase",
          data
        });
      }
    }

    // In-memory fallback
    return res.json({
      success: true,
      source: "memory-fallback",
      data: SIBI_ALPHABETS
    });
  } catch (err) {
    console.error("Error fetching alphabets:", err);
    return res.json({
      success: true,
      source: "memory-fallback",
      data: SIBI_ALPHABETS
    });
  }
};

export const getAlphabetByLetter = async (req, res) => {
  const { letter } = req.params;
  const upper = String(letter || "").toUpperCase();

  const found = SIBI_ALPHABETS.find((a) => a.letter === upper);
  if (!found) {
    return res.status(404).json({
      success: false,
      message: `Alfabet SIBI '${upper}' tidak ditemukan.`
    });
  }

  return res.json({
    success: true,
    data: found
  });
};
