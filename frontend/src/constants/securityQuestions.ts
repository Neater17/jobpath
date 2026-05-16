export const SECURITY_QUESTIONS = [
  {
    key: "first_pet",
    label: "What was the name of your first pet?",
  },
  {
    key: "favorite_childhood_book",
    label: "What is the title of your favorite childhood book?",
  },
  {
    key: "first_car",
    label: "What was the make and model of your first car?",
  },
  {
    key: "first_met_best_friend_city",
    label: "What city were you in when you first met your best friend?",
  },
  {
    key: "street_when_ten",
    label: "What is the name of the street you lived on when you were 10 years old?",
  },
] as const;

export type SecurityQuestionKey = (typeof SECURITY_QUESTIONS)[number]["key"];
