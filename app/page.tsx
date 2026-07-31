"use client";

import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

type Frequency =
  | "Monthly"
  | "Weekly"
  | "Biweekly"
  | "Quarterly"
  | "Semiannual"
  | "Annual"
  | "One-time monthly";

type Expense = {
  id: string;
  name: string;
  category: string;
  amount: number;
  frequency: Frequency;
  notes: string;
  active: boolean;
};

type Employee = {
  id: string;
  name: string;
  title: string;
  annualSalary: number;
  monthlyCompensation?: number;
  billing: boolean;
  active: boolean;
  notes: string;
};

type Scenario = {
  id: string;
  name: string;
  savedAt: string;
  profitMargin: number;
  expenses: Expense[];
  employees: Employee[];
};

const frequencies: Frequency[] = [
  "Monthly",
  "Weekly",
  "Biweekly",
  "Quarterly",
  "Semiannual",
  "Annual",
  "One-time monthly",
];

const categories = [
  "Rent",
  "Payroll",
  "Advertising",
  "Software",
  "Insurance",
  "Utilities",
  "Office expenses",
  "Professional services",
  "Benefits",
  "Taxes",
  "Equipment",
  "Other",
];

const starterExpenses: Expense[] = [
  {
    id: "exp-rent",
    name: "Office rent",
    category: "Rent",
    amount: 18000,
    frequency: "Monthly",
    notes: "",
    active: true,
  },
  {
    id: "exp-marketing",
    name: "Advertising program",
    category: "Advertising",
    amount: 9000,
    frequency: "Monthly",
    notes: "",
    active: true,
  },
  {
    id: "exp-software",
    name: "Practice software",
    category: "Software",
    amount: 24000,
    frequency: "Annual",
    notes: "Converted to monthly equivalent",
    active: true,
  },
  {
    id: "exp-insurance",
    name: "Professional insurance",
    category: "Insurance",
    amount: 30000,
    frequency: "Annual",
    notes: "",
    active: true,
  },
];

const starterEmployees: Employee[] = [
  {
    id: "emp-a",
    name: "Attorney A",
    title: "Partner",
    annualSalary: 240000,
    billing: true,
    active: true,
    notes: "",
  },
  {
    id: "emp-b",
    name: "Attorney B",
    title: "Associate",
    annualSalary: 144000,
    billing: true,
    active: true,
    notes: "",
  },
  {
    id: "emp-c",
    name: "Paralegal C",
    title: "Paralegal",
    annualSalary: 96000,
    billing: true,
    active: true,
    notes: "",
  },
  {
    id: "emp-admin",
    name: "Operations team",
    title: "Administration",
    annualSalary: 828000,
    billing: false,
    active: true,
    notes: "Shared overhead payroll",
  },
];

const expenseBlank: Omit<Expense, "id"> = {
  name: "",
  category: "Rent",
  amount: 0,
  frequency: "Monthly",
  notes: "",
  active: true,
};

const employeeBlank: Omit<Employee, "id"> = {
  name: "",
  title: "",
  annualSalary: 0,
  billing: true,
  active: true,
  notes: "",
};

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function monthlyAmount(amount: number, frequency: Frequency) {
  const value = Number.isFinite(amount) ? amount : 0;
  switch (frequency) {
    case "Weekly":
      return (value * 52) / 12;
    case "Biweekly":
      return (value * 26) / 12;
    case "Quarterly":
      return value / 3;
    case "Semiannual":
      return value / 6;
    case "Annual":
      return value / 12;
    default:
      return value;
  }
}

function employeeMonthlyCompensation(employee: Employee) {
  if (Number.isFinite(employee.annualSalary)) {
    return employee.annualSalary / 12;
  }
  return (employee.monthlyCompensation ?? 0);
}

function normalizeEmployee(employee: Employee): Employee {
  if (Number.isFinite(employee.annualSalary)) {
    return employee;
  }
  return {
    ...employee,
    annualSalary: (employee.monthlyCompensation ?? 0) * 12,
  };
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function percent(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0);
}

function csvEscape(value: string | number | boolean) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadCsv(name: string, rows: (string | number | boolean)[][]) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>(starterExpenses);
  const [employees, setEmployees] = useState<Employee[]>(starterEmployees);
  const [expenseDraft, setExpenseDraft] = useState(expenseBlank);
  const [employeeDraft, setEmployeeDraft] = useState(employeeBlank);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [profitMargin, setProfitMargin] = useState(20);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [scenarioName, setScenarioName] = useState("Current plan");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("firm-target-calculator");
    if (stored) {
      const data = JSON.parse(stored);
      setExpenses(data.expenses ?? starterExpenses);
      setEmployees((data.employees ?? starterEmployees).map(normalizeEmployee));
      setProfitMargin(data.profitMargin ?? 20);
      setScenarios(
        (data.scenarios ?? []).map((scenario: Scenario) => ({
          ...scenario,
          employees: scenario.employees.map(normalizeEmployee),
        })),
      );
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(
      "firm-target-calculator",
      JSON.stringify({ expenses, employees, profitMargin, scenarios }),
    );
  }, [employees, expenses, loaded, profitMargin, scenarios]);

  const model = useMemo(() => {
    const activeExpenses = expenses.filter((expense) => expense.active);
    const activeEmployees = employees.filter((employee) => employee.active);
    const billingEmployees = activeEmployees.filter((employee) => employee.billing);
    const nonBillingEmployees = activeEmployees.filter((employee) => !employee.billing);
    const otherExpenses = activeExpenses.reduce(
      (sum, expense) => sum + monthlyAmount(expense.amount, expense.frequency),
      0,
    );
    const billingCompensation = billingEmployees.reduce(
      (sum, employee) => sum + employeeMonthlyCompensation(employee),
      0,
    );
    const nonBillingPayroll = nonBillingEmployees.reduce(
      (sum, employee) => sum + employeeMonthlyCompensation(employee),
      0,
    );
    const sharedOverhead = nonBillingPayroll + otherExpenses;
    const operatingCost = billingCompensation + sharedOverhead;
    const marginDecimal = Math.min(Math.max(profitMargin, 0), 99.9) / 100;
    const firmRevenueTarget =
      marginDecimal >= 1 ? 0 : operatingCost / (1 - marginDecimal);
    const requiredProfit = firmRevenueTarget - operatingCost;
    const targets = billingEmployees.map((employee) => {
      const compensationShare =
        billingCompensation > 0
          ? employeeMonthlyCompensation(employee) / billingCompensation
          : 0;
      const allocatedOverhead = sharedOverhead * compensationShare;
      const monthlyCompensation = employeeMonthlyCompensation(employee);
      const breakEven = monthlyCompensation + allocatedOverhead;
      const finalTarget = marginDecimal >= 1 ? 0 : breakEven / (1 - marginDecimal);
      return {
        ...employee,
        monthlyCompensation,
        compensationShare,
        allocatedOverhead,
        breakEven,
        profitContribution: finalTarget - breakEven,
        finalTarget,
      };
    });

    return {
      activeExpenses,
      activeEmployees,
      billingEmployees,
      nonBillingEmployees,
      otherExpenses,
      billingCompensation,
      nonBillingPayroll,
      sharedOverhead,
      operatingCost,
      firmRevenueTarget,
      requiredProfit,
      targets,
    };
  }, [employees, expenses, profitMargin]);

  const filteredExpenses =
    categoryFilter === "All"
      ? expenses
      : expenses.filter((expense) => expense.category === categoryFilter);

  function updateExpenseDraft(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value, type } = event.target;
    const checked =
      event.target instanceof HTMLInputElement ? event.target.checked : false;
    setExpenseDraft((draft) => ({
      ...draft,
      [name]: type === "checkbox" ? checked : name === "amount" ? Number(value) : value,
    }));
  }

  function updateEmployeeDraft(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value, type } = event.target;
    const checked =
      event.target instanceof HTMLInputElement ? event.target.checked : false;
    setEmployeeDraft((draft) => ({
      ...draft,
      [name]:
        type === "checkbox"
          ? checked
          : name === "annualSalary"
            ? Number(value)
            : value,
    }));
  }

  function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!expenseDraft.name.trim()) return;
    if (editingExpenseId) {
      setExpenses((items) =>
        items.map((item) =>
          item.id === editingExpenseId ? { ...expenseDraft, id: item.id } : item,
        ),
      );
      setEditingExpenseId(null);
    } else {
      setExpenses((items) => [...items, { ...expenseDraft, id: id("expense") }]);
    }
    setExpenseDraft(expenseBlank);
  }

  function submitEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!employeeDraft.name.trim()) return;
    if (editingEmployeeId) {
      setEmployees((items) =>
        items.map((item) =>
          item.id === editingEmployeeId ? { ...employeeDraft, id: item.id } : item,
        ),
      );
      setEditingEmployeeId(null);
    } else {
      setEmployees((items) => [...items, { ...employeeDraft, id: id("employee") }]);
    }
    setEmployeeDraft(employeeBlank);
  }

  function saveScenario() {
    const name = scenarioName.trim() || "Untitled scenario";
    setScenarios((items) => [
      {
        id: id("scenario"),
        name,
        savedAt: new Date().toISOString(),
        profitMargin,
        expenses,
        employees,
      },
      ...items,
    ]);
  }

  function loadScenario(scenario: Scenario) {
    setExpenses(scenario.expenses);
    setEmployees(scenario.employees);
    setProfitMargin(scenario.profitMargin);
    setScenarioName(scenario.name);
  }

  function exportExpenses() {
    downloadCsv("expenses.csv", [
      ["Name", "Category", "Amount", "Frequency", "Monthly equivalent", "Active", "Notes"],
      ...expenses.map((expense) => [
        expense.name,
        expense.category,
        expense.amount,
        expense.frequency,
        monthlyAmount(expense.amount, expense.frequency).toFixed(2),
        expense.active,
        expense.notes,
      ]),
    ]);
  }

  function exportTargets() {
    downloadCsv("billing-targets.csv", [
      [
        "Employee",
        "Job title",
        "Annual salary",
        "Monthly compensation",
        "Compensation percentage",
        "Allocated overhead",
        "Break-even revenue",
        "Profit contribution",
        "Final revenue target",
      ],
      ...model.targets.map((target) => [
        target.name,
        target.title,
        target.annualSalary,
        target.monthlyCompensation,
        (target.compensationShare * 100).toFixed(2),
        target.allocatedOverhead.toFixed(2),
        target.breakEven.toFixed(2),
        target.profitContribution.toFixed(2),
        target.finalTarget.toFixed(2),
      ]),
    ]);
  }

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#1f2933]">
      <section className="border-b border-[#d8d2c4] bg-[#103d3b] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-8 md:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f1b25b]">
              Private planning tool
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal md:text-6xl">
              Firm Target Calculator
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#dce7e2]">
              Allocate shared overhead by billing compensation and turn monthly
              costs into firm-wide and individual revenue targets.
            </p>
          </div>
          <div className="w-full max-w-sm border border-white/20 bg-white/10 p-5 backdrop-blur">
            <label className="text-sm font-medium text-[#eaf2ef]" htmlFor="margin">
              Desired profit margin
            </label>
            <div className="mt-3 flex items-center gap-3">
              <input
                id="margin"
                min="0"
                max="99"
                step="0.5"
                type="range"
                value={profitMargin}
                onChange={(event) => setProfitMargin(Number(event.target.value))}
                className="w-full accent-[#f1b25b]"
              />
              <input
                aria-label="Profit margin percentage"
                className="w-20 border border-white/30 bg-white/15 px-3 py-2 text-right text-lg font-semibold text-white outline-none"
                min="0"
                max="99"
                step="0.5"
                type="number"
                value={profitMargin}
                onChange={(event) =>
                  setProfitMargin(Math.min(Number(event.target.value), 99))
                }
              />
            </div>
            <p className="mt-3 text-sm text-[#dce7e2]">
              Uses true margin: revenue target = cost / (1 - margin), so 20%
              margin on $100,000 cost requires $125,000 revenue.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
        <section aria-label="Financial summary" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Billing compensation" value={currency(model.billingCompensation)} />
          <Metric label="Non-billing payroll" value={currency(model.nonBillingPayroll)} />
          <Metric label="Other monthly expenses" value={currency(model.otherExpenses)} />
          <Metric label="Shared overhead" value={currency(model.sharedOverhead)} tone="amber" />
          <Metric label="Monthly operating cost" value={currency(model.operatingCost)} />
          <Metric label="Desired margin" value={`${profitMargin}%`} />
          <Metric label="Required monthly profit" value={currency(model.requiredProfit)} />
          <Metric label="Firm revenue target" value={currency(model.firmRevenueTarget)} tone="green" />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="overflow-hidden border border-[#d8d2c4] bg-white">
            <div className="flex flex-col gap-3 border-b border-[#d8d2c4] px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Billing employee targets</h2>
                <p className="text-sm text-[#5f6b73]">
                  Allocation follows each employee&apos;s share of total billing compensation.
                </p>
              </div>
              <button className="btn-secondary" type="button" onClick={exportTargets}>
                Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-[#eee9df] text-xs uppercase text-[#5f6b73]">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3 text-right">Annual salary</th>
                    <th className="px-4 py-3 text-right">Monthly comp</th>
                    <th className="px-4 py-3 text-right">Share</th>
                    <th className="px-4 py-3 text-right">Overhead</th>
                    <th className="px-4 py-3 text-right">Break-even</th>
                    <th className="px-4 py-3 text-right">Profit</th>
                    <th className="px-4 py-3 text-right">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {model.targets.map((target) => (
                    <tr key={target.id} className="border-t border-[#eee9df]">
                      <td className="px-4 py-4 font-medium">{target.name}</td>
                      <td className="px-4 py-4 text-[#5f6b73]">{target.title}</td>
                      <td className="px-4 py-4 text-right">{currency(target.annualSalary)}</td>
                      <td className="px-4 py-4 text-right">{currency(target.monthlyCompensation)}</td>
                      <td className="px-4 py-4 text-right">{percent(target.compensationShare)}</td>
                      <td className="px-4 py-4 text-right">{currency(target.allocatedOverhead)}</td>
                      <td className="px-4 py-4 text-right">{currency(target.breakEven)}</td>
                      <td className="px-4 py-4 text-right">{currency(target.profitContribution)}</td>
                      <td className="px-4 py-4 text-right font-semibold text-[#0f6b4f]">
                        {currency(target.finalTarget)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {model.targets.length === 0 ? (
              <p className="px-4 py-5 text-sm text-[#5f6b73]">
                Add at least one active billing employee to calculate targets.
              </p>
            ) : null}
          </div>

          <div className="border border-[#d8d2c4] bg-white p-4">
            <h2 className="text-xl font-semibold">Saved scenarios</h2>
            <div className="mt-4 flex gap-2">
              <input
                className="field"
                value={scenarioName}
                onChange={(event) => setScenarioName(event.target.value)}
                aria-label="Scenario name"
              />
              <button className="btn-primary shrink-0" type="button" onClick={saveScenario}>
                Save
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {scenarios.map((scenario) => (
                <div
                  className="flex items-center justify-between gap-3 border border-[#eee9df] px-3 py-3"
                  key={scenario.id}
                >
                  <div>
                    <p className="font-medium">{scenario.name}</p>
                    <p className="text-xs text-[#5f6b73]">
                      {new Date(scenario.savedAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => loadScenario(scenario)}
                  >
                    Load
                  </button>
                </div>
              ))}
              {scenarios.length === 0 ? (
                <p className="text-sm text-[#5f6b73]">
                  Save a snapshot before changing assumptions.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <Panel title="Expenses" action={<button className="btn-secondary" onClick={exportExpenses} type="button">Export CSV</button>}>
            <form className="form-grid" onSubmit={submitExpense}>
              <input className="field" name="name" placeholder="Expense name" value={expenseDraft.name} onChange={updateExpenseDraft} />
              <select className="field" name="category" value={expenseDraft.category} onChange={updateExpenseDraft}>
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
              <input className="field" min="0" name="amount" placeholder="Amount" type="number" value={expenseDraft.amount} onChange={updateExpenseDraft} />
              <select className="field" name="frequency" value={expenseDraft.frequency} onChange={updateExpenseDraft}>
                {frequencies.map((frequency) => <option key={frequency}>{frequency}</option>)}
              </select>
              <textarea className="field md:col-span-2" name="notes" placeholder="Notes" value={expenseDraft.notes} onChange={updateExpenseDraft} />
              <label className="check">
                <input name="active" type="checkbox" checked={expenseDraft.active} onChange={updateExpenseDraft} />
                Active
              </label>
              <button className="btn-primary" type="submit">
                {editingExpenseId ? "Update expense" : "Add expense"}
              </button>
            </form>
            <div className="mt-4 flex items-center justify-between gap-3">
              <select className="field max-w-56" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option>All</option>
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
              <strong>{currency(model.otherExpenses)} monthly</strong>
            </div>
            <ItemList>
              {filteredExpenses.map((expense) => (
                <li className="list-row" key={expense.id}>
                  <div>
                    <p className="font-medium">{expense.name}</p>
                    <p className="text-sm text-[#5f6b73]">
                      {expense.category} | {currency(expense.amount)} {expense.frequency} | {currency(monthlyAmount(expense.amount, expense.frequency))}/mo
                    </p>
                  </div>
                  <RowActions
                    active={expense.active}
                    onEdit={() => {
                      setExpenseDraft({ ...expense });
                      setEditingExpenseId(expense.id);
                    }}
                    onToggle={() => setExpenses((items) => items.map((item) => item.id === expense.id ? { ...item, active: !item.active } : item))}
                    onDelete={() => setExpenses((items) => items.filter((item) => item.id !== expense.id))}
                  />
                </li>
              ))}
            </ItemList>
          </Panel>

          <Panel title="Employees">
            <form className="form-grid" onSubmit={submitEmployee}>
              <input className="field" name="name" placeholder="Employee name" value={employeeDraft.name} onChange={updateEmployeeDraft} />
              <input className="field" name="title" placeholder="Job title" value={employeeDraft.title} onChange={updateEmployeeDraft} />
              <label className="field-label">
                <span>Annual salary</span>
                <input className="field" min="0" name="annualSalary" placeholder="Annual salary" type="number" value={employeeDraft.annualSalary} onChange={updateEmployeeDraft} />
              </label>
              <div className="calculated-field">
                <span>Calculated monthly</span>
                <strong>{currency(employeeDraft.annualSalary / 12)}</strong>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="check">
                  <input name="billing" type="checkbox" checked={employeeDraft.billing} onChange={updateEmployeeDraft} />
                  Billing
                </label>
                <label className="check">
                  <input name="active" type="checkbox" checked={employeeDraft.active} onChange={updateEmployeeDraft} />
                  Active
                </label>
              </div>
              <textarea className="field md:col-span-2" name="notes" placeholder="Notes" value={employeeDraft.notes} onChange={updateEmployeeDraft} />
              <button className="btn-primary md:col-span-2" type="submit">
                {editingEmployeeId ? "Update employee" : "Add employee"}
              </button>
            </form>
            <ItemList>
              {employees.map((employee) => (
                <li className="list-row" key={employee.id}>
                  <div>
                    <p className="font-medium">{employee.name}</p>
                    <p className="text-sm text-[#5f6b73]">
                      {employee.title || "No title"} | {currency(employee.annualSalary)}/yr | {currency(employeeMonthlyCompensation(employee))}/mo | {employee.billing ? "Billing" : "Non-billing"}
                    </p>
                  </div>
                  <RowActions
                    active={employee.active}
                    onEdit={() => {
                      setEmployeeDraft({ ...employee });
                      setEditingEmployeeId(employee.id);
                    }}
                    onToggle={() => setEmployees((items) => items.map((item) => item.id === employee.id ? { ...item, active: !item.active } : item))}
                    onDelete={() => setEmployees((items) => items.filter((item) => item.id !== employee.id))}
                  />
                </li>
              ))}
            </ItemList>
          </Panel>
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "green" | "amber";
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border border-[#d8d2c4] bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ItemList({ children }: { children: ReactNode }) {
  return <ul className="mt-4 divide-y divide-[#eee9df] border-t border-[#eee9df]">{children}</ul>;
}

function RowActions({
  active,
  onEdit,
  onToggle,
  onDelete,
}: {
  active: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button className="btn-secondary" type="button" onClick={onEdit}>Edit</button>
      <button className="btn-secondary" type="button" onClick={onToggle}>{active ? "Deactivate" : "Activate"}</button>
      <button className="btn-danger" type="button" onClick={onDelete}>Delete</button>
    </div>
  );
}
