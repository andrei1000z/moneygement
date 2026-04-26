// =====================================================================
// Debt payoff math — Snowball vs Avalanche.
//
// Snowball: prioritizează datoria cu cel mai mic balance (motivație).
// Avalanche: prioritizează datoria cu cea mai mare dobândă (matematic).
// Avalanche economisește bani; Snowball e psihologic mai motivant.
// =====================================================================

export type Debt = {
  id: string;
  name: string;
  /** Balance curent în unități MINORE (semnătură pozitivă pentru datorie). */
  balanceMinor: number;
  /** Dobândă anuală ca fracție (0.20 = 20%). */
  apr: number;
  /** Plată minimă lunară în minor units. */
  minPaymentMinor: number;
};

export type Strategy = "snowball" | "avalanche";

export type PayoffMonth = {
  month: number;
  totalBalance: number;
  totalInterest: number;
  payments: { debtId: string; payment: number; balance: number }[];
};

export type PayoffPlan = {
  strategy: Strategy;
  monthsToPayoff: number;
  totalInterestMinor: number;
  totalPaidMinor: number;
  history: PayoffMonth[];
};

const MAX_MONTHS = 600; // safeguard 50 ani

/**
 * Simulează plata datoriilor în unități MINORE. Suma `extraMonthlyMinor`
 * se aplică pe datoria-țintă (după strategy) după ce s-au plătit
 * minimele pe restul.
 */
export function simulatePayoff(
  debts: Debt[],
  strategy: Strategy,
  extraMonthlyMinor: number,
): PayoffPlan {
  const state = debts.map((d) => ({ ...d }));
  const history: PayoffMonth[] = [];
  let totalInterest = 0;
  let totalPaid = 0;

  for (let m = 1; m <= MAX_MONTHS; m++) {
    if (state.every((d) => d.balanceMinor <= 0)) break;

    // Aplică dobânda (compounding lunar = APR / 12).
    for (const d of state) {
      if (d.balanceMinor <= 0) continue;
      const monthlyRate = d.apr / 12;
      const interest = Math.round(d.balanceMinor * monthlyRate);
      d.balanceMinor += interest;
      totalInterest += interest;
    }

    // Plătește minimele pe toate.
    const payments: PayoffMonth["payments"] = [];
    let remainingExtra = extraMonthlyMinor;

    for (const d of state) {
      if (d.balanceMinor <= 0) continue;
      const pay = Math.min(d.minPaymentMinor, d.balanceMinor);
      d.balanceMinor -= pay;
      totalPaid += pay;
      payments.push({ debtId: d.id, payment: pay, balance: d.balanceMinor });
    }

    // Aplică extra pe target (după strategy).
    if (remainingExtra > 0) {
      const target = pickTarget(state, strategy);
      if (target) {
        const extraPay = Math.min(remainingExtra, target.balanceMinor);
        target.balanceMinor -= extraPay;
        totalPaid += extraPay;
        const existing = payments.find((p) => p.debtId === target.id);
        if (existing) {
          existing.payment += extraPay;
          existing.balance = target.balanceMinor;
        } else {
          payments.push({
            debtId: target.id,
            payment: extraPay,
            balance: target.balanceMinor,
          });
        }
        remainingExtra -= extraPay;
        // Cascadează surplus-ul pe următoarea datorie dacă target-ul s-a închis.
        while (remainingExtra > 0) {
          const nextTarget = pickTarget(state, strategy);
          if (!nextTarget || nextTarget.balanceMinor <= 0) break;
          const cascade = Math.min(remainingExtra, nextTarget.balanceMinor);
          nextTarget.balanceMinor -= cascade;
          totalPaid += cascade;
          remainingExtra -= cascade;
          const exist = payments.find((p) => p.debtId === nextTarget.id);
          if (exist) {
            exist.payment += cascade;
            exist.balance = nextTarget.balanceMinor;
          } else {
            payments.push({
              debtId: nextTarget.id,
              payment: cascade,
              balance: nextTarget.balanceMinor,
            });
          }
        }
      }
    }

    history.push({
      month: m,
      totalBalance: state.reduce((s, d) => s + Math.max(0, d.balanceMinor), 0),
      totalInterest,
      payments,
    });
  }

  return {
    strategy,
    monthsToPayoff: history.length,
    totalInterestMinor: totalInterest,
    totalPaidMinor: totalPaid,
    history,
  };
}

function pickTarget(
  debts: Array<{ id: string; balanceMinor: number; apr: number }>,
  strategy: Strategy,
) {
  const active = debts.filter((d) => d.balanceMinor > 0);
  if (active.length === 0) return null;
  if (strategy === "snowball") {
    return active.reduce((min, d) =>
      d.balanceMinor < min.balanceMinor ? d : min,
    );
  }
  return active.reduce((max, d) => (d.apr > max.apr ? d : max));
}
