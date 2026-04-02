import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { StatsWorkbench } from "./stats-workbench";
import type { AnalysisPayload } from "./stats-workbench";

type ThemeArgs = {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  majorColor: string;
  minorColor: string;
  warningColor: string;
  errorColor: string;
  infoColor: string;
  sectionRounded: boolean;
  layoutMode: "full" | "minimal";
};

function createThemeCss(vars: ThemeArgs): string {
  return `
  .sb-theme-workbench {
    --sb-bg: ${vars.backgroundColor};
    --sb-text: ${vars.textColor};
    --sb-border: ${vars.borderColor};
    --sb-major: ${vars.majorColor};
    --sb-minor: ${vars.minorColor};
    --sb-warning: ${vars.warningColor};
    --sb-error: ${vars.errorColor};
    --sb-info: ${vars.infoColor};
  }

  .sb-theme-workbench .bg-white { background-color: var(--sb-bg) !important; }
  .sb-theme-workbench .text-slate-900,
  .sb-theme-workbench .text-slate-800,
  .sb-theme-workbench .text-slate-700,
  .sb-theme-workbench .text-slate-600,
  .sb-theme-workbench .text-slate-500 { color: var(--sb-text) !important; }
  .sb-theme-workbench .border-slate-200,
  .sb-theme-workbench .border-slate-300 { border-color: var(--sb-border) !important; }

  .sb-theme-workbench .bg-emerald-500 { background-color: var(--sb-major) !important; }
  .sb-theme-workbench .bg-emerald-100 { background-color: color-mix(in srgb, var(--sb-major) 18%, white) !important; }
  .sb-theme-workbench .text-emerald-700 { color: var(--sb-major) !important; }
  .sb-theme-workbench .ring-emerald-200 { --tw-ring-color: color-mix(in srgb, var(--sb-major) 30%, white) !important; }

  .sb-theme-workbench .bg-slate-400 { background-color: var(--sb-minor) !important; }
  .sb-theme-workbench .bg-slate-100 { background-color: color-mix(in srgb, var(--sb-minor) 16%, white) !important; }
  .sb-theme-workbench .text-slate-700 { color: var(--sb-minor) !important; }
  .sb-theme-workbench .ring-slate-200 { --tw-ring-color: color-mix(in srgb, var(--sb-minor) 30%, white) !important; }

  .sb-theme-workbench .bg-amber-500 { background-color: var(--sb-warning) !important; }
  .sb-theme-workbench .bg-amber-100 { background-color: color-mix(in srgb, var(--sb-warning) 18%, white) !important; }
  .sb-theme-workbench .text-amber-700 { color: var(--sb-warning) !important; }
  .sb-theme-workbench .ring-amber-200 { --tw-ring-color: color-mix(in srgb, var(--sb-warning) 30%, white) !important; }

  .sb-theme-workbench .bg-red-500 { background-color: var(--sb-error) !important; }
  .sb-theme-workbench .bg-red-100 { background-color: color-mix(in srgb, var(--sb-error) 18%, white) !important; }
  .sb-theme-workbench .text-red-700,
  .sb-theme-workbench .text-red-600 { color: var(--sb-error) !important; }
  .sb-theme-workbench .ring-red-200 { --tw-ring-color: color-mix(in srgb, var(--sb-error) 30%, white) !important; }

  .sb-theme-workbench .bg-sky-500 { background-color: var(--sb-info) !important; }
  .sb-theme-workbench .bg-sky-100 { background-color: color-mix(in srgb, var(--sb-info) 18%, white) !important; }
  .sb-theme-workbench .text-sky-700 { color: var(--sb-info) !important; }
  .sb-theme-workbench .ring-sky-200 { --tw-ring-color: color-mix(in srgb, var(--sb-info) 30%, white) !important; }

  .sb-theme-workbench[data-sections-rounded="false"] .rounded-xl,
  .sb-theme-workbench[data-sections-rounded="false"] .rounded-lg,
  .sb-theme-workbench[data-sections-rounded="false"] .rounded-md,
  .sb-theme-workbench[data-sections-rounded="false"] .rounded {
    border-radius: 0 !important;
  }
`;
}

async function mockAnalysisExecutor(payload: AnalysisPayload): Promise<unknown> {
  await new Promise((resolve) => setTimeout(resolve, 350));
  return {
    success: true,
    data: {
      summary: {
        analysisType: payload.analysisType,
        method: payload.method,
        sampleSize: 128,
        pValue: 0.012,
        effectSize: 0.346
      }
    }
  };
}

function StoryTemplate(args: ThemeArgs) {
  const css = React.useMemo(() => createThemeCss(args), [args]);

  return (
    <div
      className="sb-theme-workbench h-screen w-full bg-slate-100 p-4 max-[640px]:p-2"
      data-sections-rounded={String(args.sectionRounded)}
      data-layout-mode={args.layoutMode}
      style={{ backgroundColor: "#f1f5f9" }}
    >
      <style>{css}</style>
      <StatsWorkbench className="h-full w-full rounded-xl" analysisExecutor={mockAnalysisExecutor} />
    </div>
  );
}

const meta = {
  title: "Stats/StatsWorkbench",
  component: StoryTemplate,
  tags: ["autodocs"],
  args: {
    backgroundColor: "#ffffff",
    textColor: "#334155",
    borderColor: "#e2e8f0",
    majorColor: "#22c55e",
    minorColor: "#94a3b8",
    warningColor: "#f59e0b",
    errorColor: "#dc2626",
    infoColor: "#0ea5e9",
    sectionRounded: true,
    layoutMode: "full"
  },
  argTypes: {
    backgroundColor: { control: "color", name: "Background" },
    textColor: { control: "color", name: "Text" },
    borderColor: { control: "color", name: "Border" },
    majorColor: { control: "color", name: "Major" },
    minorColor: { control: "color", name: "Minor" },
    warningColor: { control: "color", name: "Warning" },
    errorColor: { control: "color", name: "Error" },
    infoColor: { control: "color", name: "Info" },
    sectionRounded: { control: "boolean", name: "Rounded Edges" },
    layoutMode: { control: { type: "inline-radio" }, options: ["full", "minimal"], name: "Section Layout" }
  }
} satisfies Meta<typeof StoryTemplate>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InteractiveTheme: Story = {
  render: (args: ThemeArgs) => <StoryTemplate {...args} />
};
