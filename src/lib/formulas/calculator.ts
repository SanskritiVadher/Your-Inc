// ==============================================================================
// Deterministic MBA Formula Calculation Engine
// Arithmetic is strictly executed in code — never by AI.
// ==============================================================================

export interface VariableMeaning {
  symbol: string;
  meaning: string;
}

export interface FormulaDefinition {
  key: string;
  name: string;
  category: "Finance" | "Economics" | "Statistics" | "Marketing";
  formulaLatex: string;
  variables: VariableMeaning[];
  whenToUse: string;
  exampleParams: Record<string, number>;
  paramLabels: Record<string, string>;
  units?: string;
  calculate: (params: Record<string, number>) => {
    answer: number;
    formattedSteps: string[];
  };
  generatePractice: () => {
    params: Record<string, number>;
    prompt: string;
  };
}

export const FORMULA_REGISTRY: Record<string, FormulaDefinition> = {
  wacc: {
    key: "wacc",
    name: "Weighted Average Cost of Capital (WACC)",
    category: "Finance",
    formulaLatex: "WACC = \\left(\\frac{E}{V} \\times r_e\\right) + \\left(\\frac{D}{V} \\times r_d \\times (1 - T)\\right)",
    variables: [
      { symbol: "E/V", meaning: "Percentage of financing that is equity" },
      { symbol: "r_e", meaning: "Cost of equity (%)" },
      { symbol: "D/V", meaning: "Percentage of financing that is debt" },
      { symbol: "r_d", meaning: "Cost of debt (%)" },
      { symbol: "T", meaning: "Corporate tax rate (%)" },
    ],
    whenToUse: "Use to evaluate capital budget hurdles, discount cash flows in DCF models, and find a firm's average cost of funds.",
    paramLabels: {
      equityRatio: "Equity Ratio (E/V, %)",
      costEquity: "Cost of Equity (r_e, %)",
      debtRatio: "Debt Ratio (D/V, %)",
      costDebt: "Cost of Debt (r_d, %)",
      taxRate: "Corporate Tax Rate (T, %)",
    },
    exampleParams: {
      equityRatio: 60,
      costEquity: 12,
      debtRatio: 40,
      costDebt: 8,
      taxRate: 25,
    },
    units: "%",
    calculate: (p) => {
      const eFrac = p.equityRatio / 100;
      const dFrac = p.debtRatio / 100;
      const tFrac = p.taxRate / 100;
      const equityComponent = eFrac * p.costEquity;
      const debtComponent = dFrac * p.costDebt * (1 - tFrac);
      const total = equityComponent + debtComponent;
      const rounded = Math.round(total * 100) / 100;

      return {
        answer: rounded,
        formattedSteps: [
          `Equity component: ${p.equityRatio}% × ${p.costEquity}% = ${equityComponent.toFixed(2)}%`,
          `After-tax cost of debt: ${p.costDebt}% × (1 - ${p.taxRate}%) = ${(p.costDebt * (1 - tFrac)).toFixed(2)}%`,
          `Debt component: ${p.debtRatio}% × ${(p.costDebt * (1 - tFrac)).toFixed(2)}% = ${debtComponent.toFixed(2)}%`,
          `Total WACC = ${equityComponent.toFixed(2)}% + ${debtComponent.toFixed(2)}% = ${rounded}%`,
        ],
      };
    },
    generatePractice: () => {
      const eRatio = Math.floor(Math.random() * 5) * 10 + 40; // 40, 50, 60, 70, 80
      const dRatio = 100 - eRatio;
      const costEquity = Math.floor(Math.random() * 6) + 10; // 10% - 15%
      const costDebt = Math.floor(Math.random() * 4) + 6; // 6% - 9%
      const taxRate = [20, 25, 30][Math.floor(Math.random() * 3)];
      return {
        params: { equityRatio: eRatio, debtRatio: dRatio, costEquity, costDebt, taxRate },
        prompt: `A firm is financed with ${eRatio}% equity and ${dRatio}% debt. Its cost of equity is ${costEquity}%, pre-tax cost of debt is ${costDebt}%, and corporate tax rate is ${taxRate}%. Calculate the WACC (in %).`,
      };
    },
  },

  dupont: {
    key: "dupont",
    name: "DuPont 3-Way Identity (Return on Equity)",
    category: "Finance",
    formulaLatex: "ROE = \\left(\\frac{\\text{Net Income}}{\\text{Sales}}\\right) \\times \\left(\\frac{\\text{Sales}}{\\text{Total Assets}}\\right) \\times \\left(\\frac{\\text{Total Assets}}{\\text{Equity}}\\right)",
    variables: [
      { symbol: "Net Margin", meaning: "Net Income / Sales (operating efficiency, %)" },
      { symbol: "Asset Turnover", meaning: "Sales / Total Assets (asset use efficiency)" },
      { symbol: "Equity Multiplier", meaning: "Total Assets / Equity (financial leverage)" },
    ],
    whenToUse: "Use to decompose Return on Equity (ROE) into profitability, asset efficiency, and financial leverage to diagnose performance changes.",
    paramLabels: {
      netMargin: "Net Profit Margin (%)",
      assetTurnover: "Total Asset Turnover (x)",
      equityMultiplier: "Equity Multiplier (x)",
    },
    exampleParams: {
      netMargin: 8,
      assetTurnover: 1.5,
      equityMultiplier: 2.0,
    },
    units: "%",
    calculate: (p) => {
      const total = p.netMargin * p.assetTurnover * p.equityMultiplier;
      const rounded = Math.round(total * 100) / 100;
      return {
        answer: rounded,
        formattedSteps: [
          `Net Profit Margin = ${p.netMargin}%`,
          `Total Asset Turnover = ${p.assetTurnover}x`,
          `Financial Leverage Multiplier = ${p.equityMultiplier}x`,
          `ROE = ${p.netMargin}% × ${p.assetTurnover} × ${p.equityMultiplier} = ${rounded}%`,
        ],
      };
    },
    generatePractice: () => {
      const netMargin = Math.floor(Math.random() * 6) + 5; // 5% - 10%
      const assetTurnover = Number((Math.random() * 1 + 1).toFixed(1)); // 1.0 - 2.0
      const equityMultiplier = Number((Math.random() * 1.5 + 1.5).toFixed(1)); // 1.5 - 3.0
      return {
        params: { netMargin, assetTurnover, equityMultiplier },
        prompt: `A company reports a net profit margin of ${netMargin}%, total asset turnover of ${assetTurnover}x, and an equity multiplier of ${equityMultiplier}x. What is its Return on Equity (ROE) in %?`,
      };
    },
  },

  breakeven: {
    key: "breakeven",
    name: "Break-Even Volume (Units)",
    category: "Finance",
    formulaLatex: "Q_{\\text{BE}} = \\frac{\\text{Fixed Costs}}{P - V}",
    variables: [
      { symbol: "Fixed Costs", meaning: "Total recurring expenses that do not vary with output" },
      { symbol: "P", meaning: "Selling price per unit" },
      { symbol: "V", meaning: "Variable cost per unit" },
      { symbol: "P - V", meaning: "Unit contribution margin" },
    ],
    whenToUse: "Use to determine minimum production or sales volume needed to cover all fixed expenses with zero profit/loss.",
    paramLabels: {
      fixedCosts: "Fixed Costs (₹)",
      pricePerUnit: "Selling Price per Unit (₹)",
      variableCostPerUnit: "Variable Cost per Unit (₹)",
    },
    exampleParams: {
      fixedCosts: 100000,
      pricePerUnit: 50,
      variableCostPerUnit: 30,
    },
    units: "units",
    calculate: (p) => {
      const unitMargin = p.pricePerUnit - p.variableCostPerUnit;
      const total = unitMargin > 0 ? p.fixedCosts / unitMargin : 0;
      const rounded = Math.round(total);
      return {
        answer: rounded,
        formattedSteps: [
          `Unit Contribution Margin = Selling Price (₹${p.pricePerUnit}) - Variable Cost (₹${p.variableCostPerUnit}) = ₹${unitMargin}`,
          `Break-Even Quantity = Fixed Costs (₹${p.fixedCosts}) ÷ Unit Contribution Margin (₹${unitMargin})`,
          `Break-Even Quantity = ${rounded} units`,
        ],
      };
    },
    generatePractice: () => {
      const fixedCosts = [50000, 80000, 120000, 200000][Math.floor(Math.random() * 4)];
      const pricePerUnit = [60, 80, 100, 150][Math.floor(Math.random() * 4)];
      const varCostMargin = [20, 30, 40][Math.floor(Math.random() * 3)];
      const variableCostPerUnit = pricePerUnit - varCostMargin;
      return {
        params: { fixedCosts, pricePerUnit, variableCostPerUnit },
        prompt: `A factory has fixed operating costs of ₹${fixedCosts.toLocaleString("en-IN")}. Each unit sells for ₹${pricePerUnit} with variable costs of ₹${variableCostPerUnit} per unit. How many units must be sold to break even?`,
      };
    },
  },

  clv: {
    key: "clv",
    name: "Customer Lifetime Value (CLV)",
    category: "Marketing",
    formulaLatex: "\\text{CLV} = \\frac{\\text{Annual Margin} \\times r}{1 + d - r}",
    variables: [
      { symbol: "Annual Margin", meaning: "Annual gross contribution margin per customer (₹)" },
      { symbol: "r", meaning: "Annual customer retention rate (0 to 1)" },
      { symbol: "d", meaning: "Annual cost of capital / discount rate (0 to 1)" },
    ],
    whenToUse: "Use to evaluate customer acquisition budgets, long-term customer profitability, and churn reduction ROI.",
    paramLabels: {
      annualMargin: "Annual Margin per Customer (₹)",
      retentionRate: "Customer Retention Rate (%)",
      discountRate: "Discount Rate (%)",
    },
    exampleParams: {
      annualMargin: 2000,
      retentionRate: 80,
      discountRate: 10,
    },
    units: "₹",
    calculate: (p) => {
      const r = p.retentionRate / 100;
      const d = p.discountRate / 100;
      const denom = 1 + d - r;
      const total = denom > 0 ? (p.annualMargin * r) / denom : 0;
      const rounded = Math.round(total * 100) / 100;
      return {
        answer: rounded,
        formattedSteps: [
          `Retention rate r = ${r}, Discount rate d = ${d}`,
          `Denominator (1 + d - r) = 1 + ${d} - ${r} = ${denom.toFixed(2)}`,
          `Numerator (Annual Margin × r) = ₹${p.annualMargin} × ${r} = ₹${(p.annualMargin * r).toFixed(2)}`,
          `CLV = ₹${(p.annualMargin * r).toFixed(2)} ÷ ${denom.toFixed(2)} = ₹${rounded.toLocaleString("en-IN")}`,
        ],
      };
    },
    generatePractice: () => {
      const annualMargin = [1500, 2500, 3000, 5000][Math.floor(Math.random() * 4)];
      const retentionRate = [70, 75, 80, 85][Math.floor(Math.random() * 4)];
      const discountRate = 10;
      return {
        params: { annualMargin, retentionRate, discountRate },
        prompt: `An enterprise subscription yields an annual gross margin of ₹${annualMargin.toLocaleString("en-IN")} per account. If annual retention is ${retentionRate}% and the discount rate is ${discountRate}%, compute the customer lifetime value (CLV in ₹, rounded to nearest whole number).`,
      };
    },
  },

  elasticity: {
    key: "elasticity",
    name: "Price Elasticity of Demand (PED)",
    category: "Economics",
    formulaLatex: "E_d = \\left|\\frac{\\% \\Delta Q}{\\% \\Delta P}\\right| = \\left|\\frac{(Q_2 - Q_1) / Q_1}{(P_2 - P_1) / P_1}\\right|",
    variables: [
      { symbol: "% ΔQ", meaning: "Percentage change in quantity demanded" },
      { symbol: "% ΔP", meaning: "Percentage change in unit selling price" },
    ],
    whenToUse: "Use to evaluate revenue impact of price adjustments (elastic > 1: revenue drops on price increase; inelastic < 1: revenue rises).",
    paramLabels: {
      initialQuantity: "Initial Quantity (Q1)",
      newQuantity: "New Quantity (Q2)",
      initialPrice: "Initial Price (P1, ₹)",
      newPrice: "New Price (P2, ₹)",
    },
    exampleParams: {
      initialQuantity: 1000,
      newQuantity: 800,
      initialPrice: 50,
      newPrice: 60,
    },
    calculate: (p) => {
      const pctDeltaQ = (p.newQuantity - p.initialQuantity) / p.initialQuantity;
      const pctDeltaP = (p.newPrice - p.initialPrice) / p.initialPrice;
      const ed = pctDeltaP !== 0 ? Math.abs(pctDeltaQ / pctDeltaP) : 0;
      const rounded = Math.round(ed * 100) / 100;
      return {
        answer: rounded,
        formattedSteps: [
          `% ΔQuantity = (${p.newQuantity} - ${p.initialQuantity}) / ${p.initialQuantity} = ${(pctDeltaQ * 100).toFixed(1)}%`,
          `% ΔPrice = (${p.newPrice} - ${p.initialPrice}) / ${p.initialPrice} = ${(pctDeltaP * 100).toFixed(1)}%`,
          `Price Elasticity = |${(pctDeltaQ * 100).toFixed(1)}% ÷ ${(pctDeltaP * 100).toFixed(1)}%| = ${rounded}`,
          `${rounded > 1 ? "Elastic (sensitive to price)" : rounded === 1 ? "Unitary elastic" : "Inelastic (insensitive to price)"}`,
        ],
      };
    },
    generatePractice: () => {
      const initialPrice = 100;
      const newPrice = 120; // +20%
      const initialQuantity = 500;
      const dropPct = [10, 15, 20, 30][Math.floor(Math.random() * 4)];
      const newQuantity = initialQuantity * (1 - dropPct / 100);
      return {
        params: { initialQuantity, newQuantity, initialPrice, newPrice },
        prompt: `When product price rises from ₹${initialPrice} to ₹${newPrice}, monthly sales drop from ${initialQuantity} to ${newQuantity} units. Calculate the absolute price elasticity of demand (PED).`,
      };
    },
  },

  inventory_turnover: {
    key: "inventory_turnover",
    name: "Inventory Turnover & Days of Inventory (DSI)",
    category: "Finance",
    formulaLatex: "\\text{Turnover} = \\frac{\\text{COGS}}{\\text{Average Inventory}}, \\quad \\text{DSI} = \\frac{365}{\\text{Turnover}}",
    variables: [
      { symbol: "COGS", meaning: "Cost of Goods Sold over the fiscal year" },
      { symbol: "Average Inventory", meaning: "(Beginning Inventory + Ending Inventory) / 2" },
      { symbol: "DSI", meaning: "Days Sales of Inventory (days needed to turn stock)" },
    ],
    whenToUse: "Use in working capital management and supply chain analysis to monitor warehouse efficiency and cash conversion cycle.",
    paramLabels: {
      cogs: "Cost of Goods Sold (COGS, ₹)",
      avgInventory: "Average Inventory Balance (₹)",
    },
    exampleParams: {
      cogs: 600000,
      avgInventory: 150000,
    },
    units: "times/yr",
    calculate: (p) => {
      const turnover = p.avgInventory > 0 ? p.cogs / p.avgInventory : 0;
      const dsi = turnover > 0 ? 365 / turnover : 0;
      const roundedTurnover = Math.round(turnover * 10) / 10;
      const roundedDsi = Math.round(dsi);
      return {
        answer: roundedTurnover,
        formattedSteps: [
          `Inventory Turnover = COGS (₹${p.cogs.toLocaleString("en-IN")}) ÷ Average Inventory (₹${p.avgInventory.toLocaleString("en-IN")})`,
          `Turnover = ${roundedTurnover} times per year`,
          `Days of Inventory (DSI) = 365 ÷ ${roundedTurnover} = ${roundedDsi} days`,
        ],
      };
    },
    generatePractice: () => {
      const avgInventory = [100000, 200000, 250000][Math.floor(Math.random() * 3)];
      const mult = [4, 5, 6, 8][Math.floor(Math.random() * 4)];
      const cogs = avgInventory * mult;
      return {
        params: { cogs, avgInventory },
        prompt: `An industrial distributor records annual COGS of ₹${cogs.toLocaleString("en-IN")} and holds an average inventory of ₹${avgInventory.toLocaleString("en-IN")}. What is the inventory turnover ratio?`,
      };
    },
  },

  contribution_margin: {
    key: "contribution_margin",
    name: "Contribution Margin Ratio",
    category: "Finance",
    formulaLatex: "\\text{CM Ratio} = \\frac{P - V}{P} \\times 100",
    variables: [
      { symbol: "P", meaning: "Selling price per unit (₹)" },
      { symbol: "V", meaning: "Variable cost per unit (₹)" },
      { symbol: "P - V", meaning: "Unit contribution margin" },
    ],
    whenToUse: "Use to evaluate how sales revenue flows into covering fixed costs and generating operating profit.",
    paramLabels: {
      pricePerUnit: "Selling Price per Unit (₹)",
      variableCostPerUnit: "Variable Cost per Unit (₹)",
    },
    exampleParams: {
      pricePerUnit: 200,
      variableCostPerUnit: 120,
    },
    units: "%",
    calculate: (p) => {
      const margin = p.pricePerUnit - p.variableCostPerUnit;
      const ratio = p.pricePerUnit > 0 ? (margin / p.pricePerUnit) * 100 : 0;
      const rounded = Math.round(ratio * 10) / 10;
      return {
        answer: rounded,
        formattedSteps: [
          `Unit Margin = Price (₹${p.pricePerUnit}) - Variable Cost (₹${p.variableCostPerUnit}) = ₹${margin}`,
          `Contribution Margin Ratio = (₹${margin} ÷ ₹${p.pricePerUnit}) × 100 = ${rounded}%`,
        ],
      };
    },
    generatePractice: () => {
      const pricePerUnit = [100, 200, 250, 500][Math.floor(Math.random() * 4)];
      const marginPct = [30, 40, 50, 60][Math.floor(Math.random() * 4)];
      const variableCostPerUnit = pricePerUnit * (1 - marginPct / 100);
      return {
        params: { pricePerUnit, variableCostPerUnit },
        prompt: `A product sells for ₹${pricePerUnit} and incurs ₹${variableCostPerUnit} in variable costs per unit. Calculate the contribution margin ratio (in %).`,
      };
    },
  },
};

/**
 * Validates a student's practice answer against exact deterministic code calculation.
 */
export function checkPracticeAnswer(
  formulaKey: string,
  params: Record<string, number>,
  userAnswer: number
): {
  isCorrect: boolean;
  correctAnswer: number;
  difference: number;
  steps: string[];
} {
  const formula = FORMULA_REGISTRY[formulaKey];
  if (!formula) {
    throw new Error(`Formula not found: ${formulaKey}`);
  }

  const { answer, formattedSteps } = formula.calculate(params);
  const diff = Math.abs(userAnswer - answer);
  // Allow small rounding tolerance (±0.05 or ±1 for large numbers like units)
  const tolerance = formula.units === "units" ? 1.0 : 0.05;
  const isCorrect = diff <= tolerance;

  return {
    isCorrect,
    correctAnswer: answer,
    difference: diff,
    steps: formattedSteps,
  };
}

/**
 * Convenience wrapper for code-calculated formulas.
 */
export function calculateFormulaInCode(
  formulaKey: string,
  params: Record<string, number>
): {
  answer: number;
  steps: string[];
  units: string;
} {
  const f = FORMULA_REGISTRY[formulaKey];
  if (!f) throw new Error(`Unknown formula: ${formulaKey}`);
  const calc = f.calculate(params);
  return {
    answer: calc.answer,
    steps: calc.formattedSteps,
    units: f.units || "",
  };
}

/**
 * Generates a randomized practice scenario with fresh numbers.
 */
export function generatePracticeScenario(formulaKey: string): {
  params: Record<string, number>;
  prompt: string;
} {
  const f = FORMULA_REGISTRY[formulaKey];
  if (!f) throw new Error(`Unknown formula: ${formulaKey}`);
  return f.generatePractice();
}

/**
 * Validates a user practice answer against expected value with rounding tolerance.
 */
export function validateUserPracticeAnswer(
  expectedAnswer: number,
  userAnswerInput: string | number,
  units?: string
): boolean {
  const expected = Number(expectedAnswer);
  const actual = Number(userAnswerInput);
  if (isNaN(actual)) return false;
  const tolerance = units === "units" ? 1.0 : 0.05;
  return Math.abs(expected - actual) <= tolerance;
}

