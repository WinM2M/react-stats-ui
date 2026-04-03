import { action } from "@storybook/addon-actions";
import type { Meta, StoryObj } from "@storybook/react";
import { useArgs } from "@storybook/preview-api";
import { userEvent, within } from "@storybook/test";
import * as React from "react";
import { StatsWorkbench } from "./stats-workbench";
import type { AnalysisPayload, StatsWorkbenchControl } from "./stats-workbench";

type ThemeArgs = {
  language: "en" | "ar" | "zh" | "fr" | "ru" | "es" | "ko" | "ja" | "vi";
  themeMode: "light" | "dark" | "custom";
  backgroundColor: string;
  backgroundTransparent: boolean;
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

const THEME_KEYS = [
  "backgroundColor",
  "textColor",
  "borderColor",
  "majorColor",
  "minorColor",
  "warningColor",
  "errorColor",
  "infoColor"
] as const;

const THEME_PRESETS: Record<"light" | "dark", Pick<ThemeArgs, (typeof THEME_KEYS)[number]>> = {
  light: {
    backgroundColor: "#ffffff",
    textColor: "#334155",
    borderColor: "#e2e8f0",
    majorColor: "#22c55e",
    minorColor: "#94a3b8",
    warningColor: "#f59e0b",
    errorColor: "#dc2626",
    infoColor: "#0ea5e9"
  },
  dark: {
    backgroundColor: "#0f172a",
    textColor: "#e2e8f0",
    borderColor: "#334155",
    majorColor: "#34d399",
    minorColor: "#64748b",
    warningColor: "#fbbf24",
    errorColor: "#f87171",
    infoColor: "#38bdf8"
  }
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

  .sb-theme-workbench[data-theme-mode="dark"] .text-slate-700 {
    color: color-mix(in srgb, var(--sb-text) 95%, white) !important;
  }

  .sb-theme-workbench[data-theme-mode="dark"] .text-slate-600 {
    color: color-mix(in srgb, var(--sb-text) 88%, white) !important;
  }

  .sb-theme-workbench[data-theme-mode="dark"] .border-slate-200,
  .sb-theme-workbench[data-theme-mode="dark"] .border-slate-300 {
    border-color: color-mix(in srgb, var(--sb-border) 72%, white) !important;
  }

  .sb-theme-workbench[data-theme-mode="dark"] .border-black {
    border-color: color-mix(in srgb, var(--sb-text) 82%, white) !important;
  }

  .sb-theme-workbench[data-theme-mode="dark"] .border-slate-900 {
    border-color: color-mix(in srgb, var(--sb-text) 78%, white) !important;
  }

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

function StoryTemplate({ compactHeight = false, ...args }: ThemeArgs & { compactHeight?: boolean }) {
  const css = React.useMemo(() => createThemeCss(args), [args]);

  return (
    <div
      className={
        compactHeight
          ? "sb-theme-workbench h-[50vh] min-h-[420px] w-full bg-slate-100 p-4 max-[640px]:p-2"
          : "sb-theme-workbench h-screen min-h-[760px] w-full bg-slate-100 p-4 max-[640px]:p-2"
      }
      data-theme-mode={args.themeMode}
      data-sections-rounded={String(args.sectionRounded)}
      data-layout-mode={args.layoutMode}
      style={{ backgroundColor: args.backgroundTransparent ? "transparent" : args.backgroundColor }}
    >
      <style>{css}</style>
      <StatsWorkbench className="h-full w-full rounded-xl" layoutMode={args.layoutMode} language={args.language} analysisExecutor={mockAnalysisExecutor} />
    </div>
  );
}

function ExternalControlHarness(args: ThemeArgs) {
  const ref = React.useRef<StatsWorkbenchControl>(null);
  const [status, setStatus] = React.useState("idle");

  const injectedRows = React.useMemo(
    () => [
      { score: 10, group: "A", x1: 1.2, x2: 4.1 },
      { score: 12, group: "A", x1: 1.4, x2: 3.9 },
      { score: 15, group: "B", x1: 2.1, x2: 3.2 },
      { score: 16, group: "B", x1: 2.4, x2: 2.8 }
    ],
    []
  );

  const handleInject = () => {
    ref.current?.injectData({ name: "story-injected", rows: injectedRows });
    action("external.injectData")({ rows: injectedRows.length });
    setStatus("data injected");
  };

  const handleRunTtest = async () => {
    setStatus("running t-test");
    try {
      const result = await ref.current?.runTtestIndependent({
        variable: "score",
        groupVariable: "group",
        group1Value: "A",
        group2Value: "B",
        equalVariance: true
      });
      action("external.runTtestIndependent")(result);
      setStatus("t-test completed");
    } catch (error) {
      action("external.runTtestIndependent.error")(error);
      setStatus("t-test failed");
    }
  };

  const handleToggleResult = () => {
    const next = ref.current?.toggleResultVisible();
    action("external.toggleResultVisible")({ visible: next });
    setStatus(`result visible: ${String(next)}`);
  };

  const handleCopyApa = async () => {
    const copied = await ref.current?.copyApaTable();
    action("external.copyApaTable")({ copied });
    setStatus(copied ? "apa copied" : "copy failed");
  };

  return (
    <div className="sb-theme-workbench h-screen min-h-[760px] w-full bg-slate-100 p-4 max-[640px]:p-2" data-layout-mode="minimal" data-sections-rounded={String(args.sectionRounded)}>
      <style>{createThemeCss(args)}</style>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button type="button" className="rounded border border-slate-300 bg-white px-2 py-1 text-xs" onClick={handleInject}>
          Inject Data
        </button>
        <button type="button" className="rounded border border-slate-300 bg-white px-2 py-1 text-xs" onClick={() => void handleRunTtest()}>
          Run T-Test
        </button>
        <button type="button" className="rounded border border-slate-300 bg-white px-2 py-1 text-xs" onClick={handleToggleResult}>
          Toggle Result
        </button>
        <button type="button" className="rounded border border-slate-300 bg-white px-2 py-1 text-xs" onClick={() => void handleCopyApa()}>
          Copy APA
        </button>
        <span className="text-xs text-slate-600">Status: {status}</span>
      </div>

      <StatsWorkbench
        ref={ref}
        className="h-[calc(100%-2rem)] w-full rounded-xl"
        layoutMode="minimal"
        language={args.language}
        analysisExecutor={mockAnalysisExecutor}
        onResult={(result) => action("onResult")(result)}
      />
    </div>
  );
}

const meta = {
  title: "Stats/StatsWorkbench",
  component: StoryTemplate,
  tags: ["autodocs"],
  args: {
    themeMode: "light",
    language: "en",
    backgroundColor: "#ffffff",
    backgroundTransparent: false,
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
    layoutMode: { control: { type: "inline-radio" }, options: ["full", "minimal"], name: "Section Layout" },
    language: { control: { type: "select" }, options: ["en", "ar", "zh", "fr", "ru", "es", "ko", "ja", "vi"], name: "Language" },
    themeMode: { control: { type: "inline-radio" }, options: ["light", "dark", "custom"], name: "Theme" },
    backgroundColor: { control: "color", name: "Background" },
    backgroundTransparent: { control: "boolean", name: "Background Transparent" },
    textColor: { control: "color", name: "Text" },
    borderColor: { control: "color", name: "Border" },
    majorColor: { control: "color", name: "Major" },
    minorColor: { control: "color", name: "Minor" },
    warningColor: { control: "color", name: "Warning" },
    errorColor: { control: "color", name: "Error" },
    infoColor: { control: "color", name: "Info" },
    sectionRounded: { control: "boolean", name: "Rounded Edges" }
  }
} satisfies Meta<typeof StoryTemplate>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InteractiveTheme: Story = {
  args: {
    themeMode: "light",
    backgroundColor: "#ffffff",
    textColor: "#334155",
    borderColor: "#e2e8f0",
    majorColor: "#22c55e",
    minorColor: "#94a3b8",
    warningColor: "#f59e0b",
    errorColor: "#dc2626",
    infoColor: "#0ea5e9"
  },

  render: function Render(args: ThemeArgs, context: { viewMode?: string }) {
    const [, updateArgs] = useArgs<ThemeArgs>();
    const isApplyingPresetRef = React.useRef(false);

    React.useEffect(() => {
      if (args.themeMode === "custom") {
        return;
      }

      const preset = THEME_PRESETS[args.themeMode];
      const needsUpdate = THEME_KEYS.some((key) => args[key] !== preset[key]);
      if (!needsUpdate) {
        return;
      }

      isApplyingPresetRef.current = true;
      updateArgs(preset);
    }, [args.themeMode, args.backgroundColor, args.textColor, args.borderColor, args.majorColor, args.minorColor, args.warningColor, args.errorColor, args.infoColor, updateArgs]);

    React.useEffect(() => {
      if (args.themeMode === "custom") {
        return;
      }

      const preset = THEME_PRESETS[args.themeMode];
      const diverged = THEME_KEYS.some((key) => args[key] !== preset[key]);

      if (isApplyingPresetRef.current && !diverged) {
        isApplyingPresetRef.current = false;
        return;
      }

      if (!isApplyingPresetRef.current && diverged) {
        updateArgs({ themeMode: "custom" });
      }
    }, [args.themeMode, args.backgroundColor, args.textColor, args.borderColor, args.majorColor, args.minorColor, args.warningColor, args.errorColor, args.infoColor, updateArgs]);

    return <StoryTemplate {...args} compactHeight={context.viewMode === "docs"} />;
  }
};

export const ExternalControlInteractions: Story = {
  name: "External Control Interactions",
  args: {
    themeMode: "light",
    backgroundColor: "#ffffff",
    textColor: "#334155",
    borderColor: "#e2e8f0",
    majorColor: "#22c55e",
    minorColor: "#94a3b8",
    warningColor: "#f59e0b",
    errorColor: "#dc2626",
    infoColor: "#0ea5e9",
    layoutMode: "minimal"
  },
  render: (args: ThemeArgs) => <ExternalControlHarness {...args} />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("Inject runtime data", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Inject Data" }));
    });

    await step("Run external t-test wrapper", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Run T-Test" }));
    });

    await step("Toggle minimal result panel", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Toggle Result" }));
    });
  }
};
