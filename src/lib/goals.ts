// Ημερήσιοι διατροφικοί στόχοι.
export interface Goals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

// Προεπιλογές (fallback όταν ο χρήστης δεν έχει ορίσει δικούς του στόχους).
export const DEFAULT_GOALS: Goals = {
  calories: 2200,
  protein: 140,
  carbs: 250,
  fats: 70,
};
