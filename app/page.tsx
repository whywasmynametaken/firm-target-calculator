"use client";

import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
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
  title?: string;
  tags: string[];
  annualSalary: number;
  averageHourlyRate?: number;
  monthlyCompensation?: number;
  billing?: boolean;
  revenueResponsibility: RevenueResponsibility;
  teamName: string;
  active: boolean;
  notes: string;
};

type RevenueResponsibility = "individual" | "team" | "none";

type TargetRow = {
  id: string;
  name: string;
  title: string;
  type: "Individual" | "Team";
  members: string;
  tags: string[];
  annualSalary: number;
  averageHourlyRate: number;
  hoursForMonthlyTarget: number | null;
  monthlyCompensation: number;
  compensationShare: number;
  allocatedOverhead: number;
  breakEven: number;
  profitContribution: number;
  finalTarget: number;
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
    tags: ["Partner", "Attorney"],
    annualSalary: 240000,
    averageHourlyRate: 450,
    revenueResponsibility: "individual",
    teamName: "",
    active: true,
    notes: "",
  },
  {
    id: "emp-b",
    name: "Attorney B",
    tags: ["Associate", "Attorney"],
    annualSalary: 144000,
    averageHourlyRate: 375,
    revenueResponsibility: "individual",
    teamName: "",
    active: true,
    notes: "",
  },
  {
    id: "emp-c",
    name: "Paralegal C",
    tags: ["Litigation", "Paralegal"],
    annualSalary: 96000,
    averageHourlyRate: 0,
    revenueResponsibility: "team",
    teamName: "Litigation Support",
    active: true,
    notes: "",
  },
  {
    id: "emp-admin",
    name: "Operations team",
    tags: ["Administration"],
    annualSalary: 828000,
    averageHourlyRate: 0,
    revenueResponsibility: "none",
    teamName: "",
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
  tags: [],
  annualSalary: 0,
  averageHourlyRate: 0,
  revenueResponsibility: "individual",
  teamName: "",
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

function cleanTag(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function uniqueTags(tags: string[]) {
  const seen = new Set<string>();
  return tags
    .map(cleanTag)
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (!tag || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function employeeTags(employee: Employee) {
  return uniqueTags([
    ...(employee.tags ?? []),
    ...(employee.title ? [employee.title] : []),
  ]);
}

function normalizeEmployee(employee: Employee): Employee {
  const revenueResponsibility =
    employee.revenueResponsibility ?? (employee.billing ? "individual" : "none");
  const teamName = employee.teamName ?? "";
  const tags = employeeTags(employee);
  const averageHourlyRate = employee.averageHourlyRate ?? 0;
  const { title: _legacyTitle, ...employeeWithoutTitle } = employee;

  if (Number.isFinite(employee.annualSalary)) {
    return {
      ...employeeWithoutTitle,
      revenueResponsibility,
      teamName,
      tags,
      averageHourlyRate,
    };
  }
  return {
    ...employeeWithoutTitle,
    annualSalary: (employee.monthlyCompensation ?? 0) * 12,
    revenueResponsibility,
    teamName,
    tags,
    averageHourlyRate,
  };
}

function isRevenueGenerating(employee: Employee) {
  return employee.revenueResponsibility === "individual" ||
    employee.revenueResponsibility === "team";
}

function responsibilityLabel(employee: Employee) {
  if (employee.revenueResponsibility === "individual") return "Individual target";
  if (employee.revenueResponsibility === "team") {
    return `Team: ${employee.teamName.trim() || "Unassigned team"}`;
  }
  return "No revenue target";
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

function hours(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value);
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
  const [tagDraft, setTagDraft] = useState("");
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [profitMargin, setProfitMargin] = useState(20);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("All");
  const [responsibilityFilter, setResponsibilityFilter] = useState("All");
  const [targetSearch, setTargetSearch] = useState("");
  const [targetTagFilter, setTargetTagFilter] = useState("All");
  const [targetTypeFilter, setTargetTypeFilter] = useState("All");
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
    const revenueEmployees = activeEmployees.filter(isRevenueGenerating);
    const nonRevenueEmployees = activeEmployees.filter(
      (employee) => !isRevenueGenerating(employee),
    );
    const otherExpenses = activeExpenses.reduce(
      (sum, expense) => sum + monthlyAmount(expense.amount, expense.frequency),
      0,
    );
    const billingCompensation = revenueEmployees.reduce(
      (sum, employee) => sum + employeeMonthlyCompensation(employee),
      0,
    );
    const nonBillingPayroll = nonRevenueEmployees.reduce(
      (sum, employee) => sum + employeeMonthlyCompensation(employee),
      0,
    );
    const sharedOverhead = nonBillingPayroll + otherExpenses;
    const operatingCost = billingCompensation + sharedOverhead;
    const marginDecimal = Math.min(Math.max(profitMargin, 0), 99.9) / 100;
    const firmRevenueTarget =
      marginDecimal >= 1 ? 0 : operatingCost / (1 - marginDecimal);
    const requiredProfit = firmRevenueTarget - operatingCost;
    const groupedTargets = new Map<string, TargetRow>();

    revenueEmployees.forEach((employee) => {
      const isTeam = employee.revenueResponsibility === "team";
      const teamName = employee.teamName.trim() || "Unassigned team";
      const key = isTeam ? `team-${teamName.toLowerCase()}` : `employee-${employee.id}`;
      const monthlyCompensation = employeeMonthlyCompensation(employee);
      const existing = groupedTargets.get(key);

      if (existing) {
        existing.annualSalary += employee.annualSalary;
        existing.monthlyCompensation += monthlyCompensation;
        existing.members = [existing.members, employee.name].filter(Boolean).join(", ");
        existing.tags = uniqueTags([...existing.tags, ...employeeTags(employee)]);
        return;
      }

      groupedTargets.set(key, {
        id: key,
        name: isTeam ? teamName : employee.name,
        title: isTeam ? "Shared team target" : (employee.title ?? ""),
        type: isTeam ? "Team" : "Individual",
        members: isTeam ? employee.name : "",
        tags: employeeTags(employee),
        annualSalary: employee.annualSalary,
        averageHourlyRate: isTeam ? 0 : (employee.averageHourlyRate ?? 0),
        hoursForMonthlyTarget: null,
        monthlyCompensation,
        compensationShare: 0,
        allocatedOverhead: 0,
        breakEven: 0,
        profitContribution: 0,
        finalTarget: 0,
      });
    });

    const targets = Array.from(groupedTargets.values()).map((target) => {
      const compensationShare =
        billingCompensation > 0
          ? target.monthlyCompensation / billingCompensation
          : 0;
      const allocatedOverhead = sharedOverhead * compensationShare;
      const breakEven = target.monthlyCompensation + allocatedOverhead;
      const finalTarget = marginDecimal >= 1 ? 0 : breakEven / (1 - marginDecimal);
      const hoursForMonthlyTarget =
        target.type === "Individual" && target.averageHourlyRate > 0
          ? finalTarget / target.averageHourlyRate
          : null;

      return {
        ...target,
        compensationShare,
        allocatedOverhead,
        breakEven,
        profitContribution: finalTarget - breakEven,
        finalTarget,
        hoursForMonthlyTarget,
      };
    });

    return {
      activeExpenses,
      activeEmployees,
      billingEmployees: revenueEmployees,
      nonBillingEmployees: nonRevenueEmployees,
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

  const allTags = useMemo(
    () => uniqueTags(employees.flatMap((employee) => employeeTags(employee))).sort(),
    [employees],
  );

  const filteredEmployees = employees.filter((employee) => {
    const search = employeeSearch.trim().toLowerCase();
    const tags = employeeTags(employee);
    const matchesSearch =
      !search ||
      employee.name.toLowerCase().includes(search) ||
      tags.some((tag) => tag.toLowerCase().includes(search)) ||
      employee.teamName.toLowerCase().includes(search) ||
      employee.notes.toLowerCase().includes(search);
    const matchesTag = tagFilter === "All" || tags.includes(tagFilter);
    const matchesResponsibility =
      responsibilityFilter === "All" ||
      employee.revenueResponsibility === responsibilityFilter;

    return matchesSearch && matchesTag && matchesResponsibility;
  });

  const filteredTargets = model.targets.filter((target) => {
    const search = targetSearch.trim().toLowerCase();
    const matchesSearch =
      !search ||
      target.name.toLowerCase().includes(search) ||
      target.members.toLowerCase().includes(search);
    const matchesTag =
      targetTagFilter === "All" || target.tags.includes(targetTagFilter);
    const matchesType =
      targetTypeFilter === "All" || target.type === targetTypeFilter;

    return matchesSearch && matchesTag && matchesType;
  });

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
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value, type } = event.target;
    const checked =
      event.target instanceof HTMLInputElement ? event.target.checked : false;
    setEmployeeDraft((draft) => ({
      ...draft,
      [name]:
        type === "checkbox"
          ? checked
          : name === "annualSalary" || name === "averageHourlyRate"
            ? Number(value)
            : value,
    }));
  }

  function addEmployeeTags(rawValue = tagDraft) {
    const nextTags = uniqueTags([
      ...employeeDraft.tags,
      ...rawValue.split(","),
    ]);
    setEmployeeDraft((draft) => ({ ...draft, tags: nextTags }));
    setTagDraft("");
  }

  function removeEmployeeTag(tagToRemove: string) {
    setEmployeeDraft((draft) => ({
      ...draft,
      tags: draft.tags.filter((tag) => tag !== tagToRemove),
    }));
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== ",") return;
    event.preventDefault();
    addEmployeeTags();
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
    const { title: _legacyTitle, ...draftWithoutTitle } = employeeDraft;
    const nextEmployee = {
      ...draftWithoutTitle,
      tags: uniqueTags([...employeeDraft.tags, ...tagDraft.split(",")]),
    };

    if (editingEmployeeId) {
      setEmployees((items) =>
        items.map((item) =>
          item.id === editingEmployeeId ? { ...nextEmployee, id: item.id } : item,
        ),
      );
      setEditingEmployeeId(null);
    } else {
      setEmployees((items) => [...items, { ...nextEmployee, id: id("employee") }]);
    }
    setEmployeeDraft(employeeBlank);
    setTagDraft("");
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
    setEmployees(scenario.employees.map(normalizeEmployee));
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
        "Target owner",
        "Type",
        "Members",
        "Annual comp",
        "Monthly comp",
        "Compensation percentage",
        "Monthly allocated overhead",
        "Monthly break-even revenue",
        "Monthly profit contribution",
        "Monthly revenue target",
        "Average hourly rate",
        "Hours required for monthly target",
      ],
      ...filteredTargets.map((target) => [
        target.name,
        target.type,
        target.members,
        target.annualSalary,
        target.monthlyCompensation,
        (target.compensationShare * 100).toFixed(2),
        target.allocatedOverhead.toFixed(2),
        target.breakEven.toFixed(2),
        target.profitContribution.toFixed(2),
        target.finalTarget.toFixed(2),
        target.type === "Individual" && target.averageHourlyRate > 0
          ? target.averageHourlyRate.toFixed(2)
          : "",
        target.hoursForMonthlyTarget === null
          ? ""
          : target.hoursForMonthlyTarget.toFixed(1),
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

        <section className="mt-6">
          <div className="overflow-hidden border border-[#d8d2c4] bg-white">
            <div className="flex flex-col gap-3 border-b border-[#d8d2c4] px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Revenue targets</h2>
                <p className="text-sm text-[#5f6b73]">
                  Individual employees and shared teams are allocated overhead by compensation share.
                </p>
              </div>
              <button className="btn-secondary" type="button" onClick={exportTargets}>
                Export CSV
              </button>
            </div>
            <div className="target-filters">
              <input
                className="field"
                placeholder="Search target owner or members"
                value={targetSearch}
                onChange={(event) => setTargetSearch(event.target.value)}
              />
              <select className="field" value={targetTagFilter} onChange={(event) => setTargetTagFilter(event.target.value)}>
                <option>All</option>
                {allTags.map((tag) => <option key={tag}>{tag}</option>)}
              </select>
              <select className="field" value={targetTypeFilter} onChange={(event) => setTargetTypeFilter(event.target.value)}>
                <option value="All">All target types</option>
                <option value="Individual">Individual</option>
                <option value="Team">Team</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1340px] text-left text-sm">
                <thead className="bg-[#eee9df] text-xs uppercase text-[#5f6b73]">
                  <tr>
                    <th className="px-4 py-3">Target owner</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Members</th>
                    <th className="px-4 py-3 text-right">Annual comp</th>
                    <th className="px-4 py-3 text-right">Monthly comp</th>
                    <th className="px-4 py-3 text-right">Share</th>
                    <th className="px-4 py-3 text-right">Monthly overhead</th>
                    <th className="px-4 py-3 text-right">Monthly break-even</th>
                    <th className="px-4 py-3 text-right">Monthly profit</th>
                    <th className="px-4 py-3 text-right">Monthly target</th>
                    <th className="px-4 py-3 text-right">Avg hourly rate</th>
                    <th className="px-4 py-3 text-right">Hours for monthly target</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTargets.map((target) => (
                    <tr key={target.id} className="border-t border-[#eee9df]">
                      <td className="px-4 py-4 font-medium">{target.name}</td>
                      <td className="px-4 py-4 text-[#5f6b73]">{target.type}</td>
                      <td className="max-w-56 px-4 py-4 text-[#5f6b73]">
                        {target.members || target.title || "-"}
                      </td>
                      <td className="px-4 py-4 text-right">{currency(target.annualSalary)}</td>
                      <td className="px-4 py-4 text-right">{currency(target.monthlyCompensation)}</td>
                      <td className="px-4 py-4 text-right">{percent(target.compensationShare)}</td>
                      <td className="px-4 py-4 text-right">{currency(target.allocatedOverhead)}</td>
                      <td className="px-4 py-4 text-right">{currency(target.breakEven)}</td>
                      <td className="px-4 py-4 text-right">{currency(target.profitContribution)}</td>
                      <td className="px-4 py-4 text-right font-semibold text-[#0f6b4f]">
                        {currency(target.finalTarget)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {target.type === "Individual" && target.averageHourlyRate > 0
                          ? currency(target.averageHourlyRate)
                          : target.type === "Individual"
                            ? "Add rate"
                            : "-"}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {hours(target.hoursForMonthlyTarget)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {model.targets.length === 0 ? (
              <p className="px-4 py-5 text-sm text-[#5f6b73]">
                Add at least one active individual or shared team employee to calculate targets.
              </p>
            ) : null}
            {model.targets.length > 0 && filteredTargets.length === 0 ? (
              <p className="px-4 py-5 text-sm text-[#5f6b73]">
                No revenue targets match the current filters.
              </p>
            ) : null}
          </div>
        </section>

        <section className="mt-6 grid gap-6">
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
                    <p className="row-meta">
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
              <label className="field-label">
                <span>Tags</span>
                <div className="tag-input">
                  <TagList tags={employeeDraft.tags} onRemove={removeEmployeeTag} />
                  <input
                    aria-label="Add employee tag"
                    placeholder="Type a tag, then Enter or comma"
                    value={tagDraft}
                    onBlur={() => addEmployeeTags()}
                    onChange={(event) => setTagDraft(event.target.value)}
                    onKeyDown={handleTagKeyDown}
                  />
                </div>
              </label>
              <label className="field-label">
                <span>Annual salary</span>
                <input className="field" min="0" name="annualSalary" placeholder="Annual salary" type="number" value={employeeDraft.annualSalary} onChange={updateEmployeeDraft} />
              </label>
              <div className="calculated-field">
                <span>Calculated monthly</span>
                <strong>{currency(employeeDraft.annualSalary / 12)}</strong>
              </div>
              <label className="field-label">
                <span>Revenue responsibility</span>
                <select
                  className="field"
                  name="revenueResponsibility"
                  value={employeeDraft.revenueResponsibility}
                  onChange={updateEmployeeDraft}
                >
                  <option value="individual">Individual target</option>
                  <option value="team">Shared team target</option>
                  <option value="none">No revenue target</option>
                </select>
              </label>
              {employeeDraft.revenueResponsibility === "individual" ? (
                <label className="field-label">
                  <span>Average hourly rate</span>
                  <input
                    className="field"
                    min="0"
                    name="averageHourlyRate"
                    placeholder="Average hourly rate"
                    type="number"
                    value={employeeDraft.averageHourlyRate ?? 0}
                    onChange={updateEmployeeDraft}
                  />
                </label>
              ) : null}
              {employeeDraft.revenueResponsibility === "team" ? (
                <label className="field-label">
                  <span>Team name</span>
                  <input
                    className="field"
                    name="teamName"
                    placeholder="Litigation Support"
                    value={employeeDraft.teamName}
                    onChange={updateEmployeeDraft}
                  />
                </label>
              ) : (
                <label className="check">
                  <input name="active" type="checkbox" checked={employeeDraft.active} onChange={updateEmployeeDraft} />
                  Active
                </label>
              )}
              {employeeDraft.revenueResponsibility === "team" ? (
                <label className="check md:col-span-2">
                  <input name="active" type="checkbox" checked={employeeDraft.active} onChange={updateEmployeeDraft} />
                  Active
                </label>
              ) : null}
              <textarea className="field md:col-span-2" name="notes" placeholder="Notes" value={employeeDraft.notes} onChange={updateEmployeeDraft} />
              <button className="btn-primary md:col-span-2" type="submit">
                {editingEmployeeId ? "Update employee" : "Add employee"}
              </button>
            </form>
            <div className="employee-filters">
              <input
                className="field"
                placeholder="Search employees or tags"
                value={employeeSearch}
                onChange={(event) => setEmployeeSearch(event.target.value)}
              />
              <select className="field" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
                <option>All</option>
                {allTags.map((tag) => <option key={tag}>{tag}</option>)}
              </select>
              <select className="field" value={responsibilityFilter} onChange={(event) => setResponsibilityFilter(event.target.value)}>
                <option value="All">All responsibilities</option>
                <option value="individual">Individual target</option>
                <option value="team">Shared team target</option>
                <option value="none">No revenue target</option>
              </select>
            </div>
            <ItemList>
              {filteredEmployees.map((employee) => (
                <li className="list-row" key={employee.id}>
                  <div>
                    <p className="font-medium">{employee.name}</p>
                    <p className="row-meta">
                      {currency(employee.annualSalary)}/yr | {currency(employeeMonthlyCompensation(employee))}/mo | {responsibilityLabel(employee)}
                      {employee.revenueResponsibility === "individual" && (employee.averageHourlyRate ?? 0) > 0
                        ? ` | ${currency(employee.averageHourlyRate ?? 0)}/hr avg`
                        : ""}
                    </p>
                    <TagList tags={employeeTags(employee)} />
                  </div>
                  <RowActions
                    active={employee.active}
                    onEdit={() => {
                      setEmployeeDraft(normalizeEmployee(employee));
                      setTagDraft("");
                      setEditingEmployeeId(employee.id);
                    }}
                    onToggle={() => setEmployees((items) => items.map((item) => item.id === employee.id ? { ...item, active: !item.active } : item))}
                    onDelete={() => setEmployees((items) => items.filter((item) => item.id !== employee.id))}
                  />
                </li>
              ))}
            </ItemList>
            {filteredEmployees.length === 0 ? (
              <p className="py-4 text-sm text-[#5f6b73]">
                No employees match the current filters.
              </p>
            ) : null}
          </Panel>

          <Panel title="Saved scenarios">
            <div className="flex gap-2">
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

function TagList({
  tags,
  onRemove,
}: {
  tags: string[];
  onRemove?: (tag: string) => void;
}) {
  if (!tags.length) {
    return <span className="tag-empty">No tags</span>;
  }

  return (
    <div className="tag-list">
      {tags.map((tag) => (
        <span className="tag-chip" key={tag}>
          {tag}
          {onRemove ? (
            <button
              aria-label={`Remove ${tag}`}
              onClick={() => onRemove(tag)}
              type="button"
            >
              x
            </button>
          ) : null}
        </span>
      ))}
    </div>
  );
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
