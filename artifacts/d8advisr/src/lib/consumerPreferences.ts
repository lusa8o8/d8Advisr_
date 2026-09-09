export const CONSUMER_PLAN_TYPES = [
  { id: "romantic", emoji: "💑", label: "Romantic Dates", description: "Perfect evenings, unforgettable moments" },
  { id: "group", emoji: "👥", label: "Group Outings", description: "Friends, family & good company" },
  { id: "occasions", emoji: "🎉", label: "Special Occasions", description: "Birthdays, anniversaries & milestones" },
  { id: "solo", emoji: "🧭", label: "Solo Exploration", description: "Adventures on your own terms" },
] as const;

export const CONSUMER_VIBES = [
  { label: "Foodie", emoji: "🍽️" },
  { label: "Romantic", emoji: "❤️" },
  { label: "Outdoor", emoji: "🌿" },
  { label: "Adventure", emoji: "⚡" },
  { label: "Nightlife", emoji: "🌙" },
  { label: "Cultural", emoji: "🎭" },
  { label: "Live Music", emoji: "🎷" },
  { label: "Coffee", emoji: "☕" },
  { label: "Artsy", emoji: "🎨" },
  { label: "Relaxing", emoji: "🛁" },
  { label: "Sports", emoji: "🏅" },
  { label: "Casual", emoji: "😎" },
] as const;

export const CONSUMER_BUDGET_RANGE = {
  min: 25,
  max: 500,
  step: 25,
  defaultValue: 150,
} as const;

export type ConsumerPlanTypeId = (typeof CONSUMER_PLAN_TYPES)[number]['id'];
export type ConsumerVibe = (typeof CONSUMER_VIBES)[number]['label'];
