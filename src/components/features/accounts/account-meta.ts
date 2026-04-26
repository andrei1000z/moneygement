import type { AccountType } from "@/types/database";

export const ACCOUNT_TYPE_META: Record<
  AccountType,
  { label: string; icon: string; description: string }
> = {
  cash: {
    label: "Numerar",
    icon: "👛",
    description: "Bani în portofel sau în casă.",
  },
  checking: {
    label: "Cont curent",
    icon: "🏦",
    description: "Cont curent la bancă (BT, ING, BCR, ...).",
  },
  savings: {
    label: "Economii",
    icon: "🐷",
    description: "Depozite, conturi de economii.",
  },
  credit_card: {
    label: "Card de credit",
    icon: "💳",
    description: "Card de credit cu limită.",
  },
  investment: {
    label: "Investiții",
    icon: "📈",
    description: "Brokeraj, fonduri, BT Capital, Tradeville.",
  },
  loan: {
    label: "Credit / Împrumut",
    icon: "🏠",
    description: "Credit ipotecar, credit nevoi personale.",
  },
  wallet: {
    label: "Portofel digital",
    icon: "📱",
    description: "Revolut, PayPal, Wise.",
  },
  meal_voucher: {
    label: "Tichete de masă",
    icon: "🍽️",
    description: "Edenred, Pluxee, Up.",
  },
};

export const ACCOUNT_TYPE_ORDER: AccountType[] = [
  "checking",
  "savings",
  "credit_card",
  "cash",
  "investment",
  "wallet",
  "meal_voucher",
  "loan",
];

export const ACCOUNT_COLORS = [
  { value: "#0EA5E9", label: "Albastru cer" },
  { value: "#22C55E", label: "Verde" },
  { value: "#A855F7", label: "Mov" },
  { value: "#F59E0B", label: "Chihlimbar" },
  { value: "#EF4444", label: "Roșu" },
  { value: "#14B8A6", label: "Turcoaz" },
  { value: "#EC4899", label: "Roz" },
  { value: "#64748B", label: "Ardezie" },
] as const;
