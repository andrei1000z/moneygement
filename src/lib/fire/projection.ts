/**
 * fire/projection.ts — calcul FIRE (Financial Independence Retire Early).
 *
 * Pure compound interest math, ZERO LLM. Reusable din UI și AI tool.
 *
 * Definiții:
 *   - Lean FIRE: 25× cheltuieli minime anuale (subzistență)
 *   - Full FIRE: 25× cheltuieli curente anuale
 *   - Coast FIRE: punctul de la care nu mai trebuie să contribui — doar
 *     randamentul te duce la Full FIRE până la pensia oficială (65 ani)
 *
 * Toate sumele în unități minore (BIGINT, RON minor = bani).
 */

export type FireInputs = {
  /** Patrimoniu curent în unități minore. */
  net_worth_minor: number;
  /** Cheltuieli anuale curente în unități minore. */
  annual_expenses_minor: number;
  /** Cheltuieli minime anuale (lean FIRE) — opțional, default 60% din curent. */
  lean_annual_expenses_minor?: number;
  /** Contribuție lunară în unități minore (savings). */
  monthly_contribution_minor: number;
  /** Randament anual așteptat (0-1). Default 0.07 (7%). */
  expected_return: number;
  /** Inflație anuală (0-1). Default 0.06 (6% RO). */
  inflation_rate: number;
  /** Vârstă curentă. */
  current_age: number;
  /** Vârstă target pentru full FIRE. */
  target_age: number;
  /** Vârstă pensia oficială (pentru Coast FIRE). Default 65. */
  retirement_age?: number;
  /** Dacă true, ratele și sumele sunt ajustate la inflație (real terms). */
  adjust_for_inflation: boolean;
};

export type FireResult = {
  /** Ținta lean FIRE (25× cheltuieli minime). */
  lean_target_minor: number;
  /** Ținta Full FIRE (25× cheltuieli curente). */
  full_target_minor: number;
  /** Ținta Coast FIRE (cât trebuie să ai la vârsta curentă pentru a coasta
   *  până la retirement_age fără contribuții). */
  coast_target_minor: number;

  /** Ani până la lean FIRE (cu rata curentă de contribuție). */
  years_to_lean: number | null;
  /** Ani până la Full FIRE. */
  years_to_full: number | null;
  /** Anul calendaristic ETA Full FIRE. */
  full_eta_year: number | null;
  /** Anul calendaristic ETA Lean FIRE. */
  lean_eta_year: number | null;

  /** Trajectory anuală: net worth proiectat la fiecare an până la target_age. */
  trajectory: Array<{
    age: number;
    year: number;
    net_worth_minor: number;
  }>;

  /** Folosit pentru afișare: rata netă (nominal sau real). */
  effective_return: number;
};

/**
 * Calculează cu motorul de compound interest cât crește net worth pe N ani
 * cu contribuții lunare regulate.
 */
function compound(
  initial: number,
  monthlyContribution: number,
  annualReturn: number,
  years: number,
): number {
  const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;
  let balance = initial;
  const months = Math.round(years * 12);
  for (let i = 0; i < months; i++) {
    balance = balance * (1 + monthlyReturn) + monthlyContribution;
  }
  return balance;
}

/**
 * Găsește numărul de ani până când balance-ul ajunge la target.
 */
function yearsToTarget(
  initial: number,
  monthlyContribution: number,
  annualReturn: number,
  target: number,
  maxYears = 60,
): number | null {
  if (initial >= target) return 0;

  // Binary search precision la lună (1/12).
  const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;
  let balance = initial;
  for (let m = 1; m <= maxYears * 12; m++) {
    balance = balance * (1 + monthlyReturn) + monthlyContribution;
    if (balance >= target) {
      return m / 12;
    }
  }
  return null;
}

export function projectFire(inputs: FireInputs): FireResult {
  const retirementAge = inputs.retirement_age ?? 65;
  const lean = inputs.lean_annual_expenses_minor ??
    Math.round(inputs.annual_expenses_minor * 0.6);

  // Real return = (1+nominal) / (1+inflation) - 1.
  const effectiveReturn = inputs.adjust_for_inflation
    ? (1 + inputs.expected_return) / (1 + inputs.inflation_rate) - 1
    : inputs.expected_return;

  const leanTarget = lean * 25;
  const fullTarget = inputs.annual_expenses_minor * 25;

  // Coast FIRE: cât trebuie să am acum ca să ajung la full FIRE doar prin
  // creștere (fără contribuții) până la retirement_age?
  // X * (1+r)^(retirement_age - current_age) = fullTarget
  // X = fullTarget / (1+r)^years
  const yearsToRetire = retirementAge - inputs.current_age;
  const coastTarget =
    yearsToRetire > 0
      ? Math.round(fullTarget / Math.pow(1 + effectiveReturn, yearsToRetire))
      : fullTarget;

  // Ani până la fiecare target.
  const yearsToLean = yearsToTarget(
    inputs.net_worth_minor,
    inputs.monthly_contribution_minor,
    effectiveReturn,
    leanTarget,
  );
  const yearsToFull = yearsToTarget(
    inputs.net_worth_minor,
    inputs.monthly_contribution_minor,
    effectiveReturn,
    fullTarget,
  );

  const currentYear = new Date().getUTCFullYear();
  const leanEta = yearsToLean !== null ? currentYear + Math.ceil(yearsToLean) : null;
  const fullEta = yearsToFull !== null ? currentYear + Math.ceil(yearsToFull) : null;

  // Trajectory: anuală până la target_age.
  const totalYears = Math.max(1, inputs.target_age - inputs.current_age);
  const trajectory: FireResult["trajectory"] = [];
  for (let yr = 0; yr <= totalYears; yr++) {
    trajectory.push({
      age: inputs.current_age + yr,
      year: currentYear + yr,
      net_worth_minor: Math.round(
        compound(
          inputs.net_worth_minor,
          inputs.monthly_contribution_minor,
          effectiveReturn,
          yr,
        ),
      ),
    });
  }

  return {
    lean_target_minor: leanTarget,
    full_target_minor: fullTarget,
    coast_target_minor: coastTarget,
    years_to_lean: yearsToLean,
    years_to_full: yearsToFull,
    lean_eta_year: leanEta,
    full_eta_year: fullEta,
    trajectory,
    effective_return: effectiveReturn,
  };
}
