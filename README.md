# @winm2m/react-stats-ui

[![npm version](https://img.shields.io/npm/v/@winm2m/react-stats-ui.svg)](https://www.npmjs.com/package/@winm2m/react-stats-ui)
[![license](https://img.shields.io/npm/l/@winm2m/react-stats-ui.svg)](./LICENSE)
[![CI](https://github.com/WinM2M/react-stats-ui/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/WinM2M/react-stats-ui/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)

React UI component for browser-based inferential statistics workflows, powered by `@winm2m/inferential-stats-js`.

## Installation

```bash
npm install @winm2m/react-stats-ui @winm2m/inferential-stats-js
```

Peer dependencies:

- `react` `^18.2.0 || ^19.0.0`
- `react-dom` `^18.2.0 || ^19.0.0`

### Tailwind CSS 설정

본 패키지를 애플리케이션에 `import`하여 사용할 때 Tailwind CSS를 함께 사용한다면, `tailwind.config.js`의 `content` 옵션에 패키지의 빌드 산출물을 포함시켜야 스타일이 정상적으로 적용됩니다.

```js
// tailwind.config.js
export default {
  content: [
    /* ... other paths ... */,
    "./node_modules/@winm2m/react-stats-ui/dist/**/*.{js,ts,tsx}"
  ],
  // ...
};
```

## What the component provides

- Dataset management with IndexedDB (import XLSX, select/delete dataset, drag-drop upload zone).
- Analysis selection popover with current analysis display, grouped into 6 categories.
- Variable assignment UI with drag/drop, double-click assignment, and role-aware validation.
- 16 built-in analysis types (t-test, ANOVA, regression, clustering, factor/component methods, etc.).
- Auto-run queue execution when inputs change (analysis, role assignment, dataset, options).
- Worker lifecycle UX (signal indicator, loading state, error state, initial blocking overlay).
- Result area with APA table rendering, JSON toggle, payload toggle, and formatted clipboard copy.
- Imperative external control API via React ref (runtime data injection, result panel visibility, APA clipboard copy, direct analysis calls).
- Two layout modes:
  - `full`: split control/result with resizable vertical divider
  - `minimal`: compact flow with slide-up result panel

## Supported analyses

- Frequencies
- Descriptives
- Crosstabs
- Independent-Samples T-Test
- Paired-Samples T-Test
- One-Way ANOVA
- Post-hoc Tukey HSD
- Linear Regression (OLS)
- Binary Logistic Regression
- Multinomial Logistic Regression
- K-Means Clustering
- Hierarchical Clustering
- Exploratory Factor Analysis
- Principal Component Analysis
- Multidimensional Scaling
- Cronbach Alpha

## Basic usage

```tsx
import * as React from "react";
import { StatsWorkbench } from "@winm2m/react-stats-ui";

export function App() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <StatsWorkbench />
    </div>
  );
}
```

## Component API

`StatsWorkbench` props:

- `className?: string`
- `style?: React.CSSProperties`
- `initialAnalysis?: AnalysisKind` (default: `"frequencies"`)
- `layoutMode?: "full" | "minimal"` (default: `"full"`)
- `language?: "en" | "ar" | "zh" | "fr" | "ru" | "es" | "ko" | "ja" | "vi"` (default: `"en"`)
- `showDatasetPopover?: boolean` (default: `true`)
- `minimalAutoShowResultEnabled?: boolean` (default: `true`)
  - When `false` in minimal layout, auto-show is disabled and the `Auto show result` switch is hidden.
- `analysisExecutor?: (payload: AnalysisPayload) => Promise<unknown>`
- `onResult?: (result: AnalysisResult) => void`

`StatsWorkbench` ref (`StatsWorkbenchControl`):

- `injectData({ rows, columns?, id?, name? })`
  - Injects runtime analysis data without writing to IndexedDB.
  - If `columns` is omitted, variable metadata is inferred from `rows`.
- `clearInjectedData()`
- `executeAnalysis(method, inputWithoutData?)`
- `runFrequencies(inputWithoutData?)`
- `runDescriptives(inputWithoutData?)`
- `runCrosstabs(inputWithoutData?)`
- `runTtestIndependent(inputWithoutData?)`
- `runTtestPaired(inputWithoutData?)`
- `runAnovaOneway(inputWithoutData?)`
- `runPosthocTukey(inputWithoutData?)`
- `runLinearRegression(inputWithoutData?)`
- `runLogisticBinary(inputWithoutData?)`
- `runLogisticMultinomial(inputWithoutData?)`
- `runKmeans(inputWithoutData?)`
- `runHierarchicalCluster(inputWithoutData?)`
- `runEfa(inputWithoutData?)`
- `runPca(inputWithoutData?)`
- `runMds(inputWithoutData?)`
- `runCronbachAlpha(inputWithoutData?)`
  - All 16 async wrappers call `@winm2m/inferential-stats-js` and always inject previously provided runtime data as `data`.
- `setResultVisible(next)` (minimal layout)
- `toggleResultVisible()` (minimal layout)
- `setAutoShowResult(next)`
- `toggleAutoShowResult()`
- `getAutoShowResult()`
- `copyApaTable()`

Example:

```tsx
import * as React from "react";
import { StatsWorkbench, type StatsWorkbenchControl } from "@winm2m/react-stats-ui";

export function App() {
  const workbenchRef = React.useRef<StatsWorkbenchControl>(null);

  const runExternal = async () => {
    workbenchRef.current?.injectData({
      name: "runtime-dataset",
      rows: [
        { score: 10, group: "A" },
        { score: 12, group: "A" },
        { score: 14, group: "B" },
        { score: 15, group: "B" }
      ]
    });

    await workbenchRef.current?.runTtestIndependent({
      variable: "score",
      groupVariable: "group",
      group1Value: "A",
      group2Value: "B",
      equalVariance: true
    });

    await workbenchRef.current?.copyApaTable();
  };

  return (
    <>
      <button onClick={() => void runExternal()}>Run external t-test</button>
      <div style={{ width: "100vw", height: "90vh" }}>
        <StatsWorkbench ref={workbenchRef} layoutMode="minimal" />
      </div>
    </>
  );
}
```

## Internationalization

The workbench includes built-in i18n via `i18next` + `react-i18next`.

Supported languages:

- `en` (English)
- `ar` (Arabic)
- `zh` (Chinese)
- `fr` (French)
- `ru` (Russian)
- `es` (Spanish)
- `ko` (Korean)
- `ja` (Japanese)
- `vi` (Vietnamese)

Coverage includes core UI labels, placeholders, role prompts, options labels, run-state messages, and result-view helper text.

Use `language` prop to set the active language:

```tsx
<StatsWorkbench language="ko" />
```

Exports:

- `StatsWorkbench`
- `AnalysisKind`
- `StatsWorkbenchProps`
- `AnalysisPayload`
- `AnalysisResult`
- `ExternalDataInput`
- `StatsWorkbenchControl`

## Execution behavior

- The workbench builds a payload and runs analysis when configuration is valid.
- Input changes are queued and processed sequentially.
- While running, duplicate execution is blocked.
- In `minimal` mode, result view is a slide-up panel.
- In `minimal` mode, result panel can be shown/hidden by UI toggle or external control.
- In `minimal` mode, multi-item role updates (for multi roles like `variables`/`independentVariables`) use a manual Play trigger shown in Role Assignment when execution is valid.

## Result behavior

- APA table view is default.
- More menu contains:
  - APA Table <-> JSON toggle
  - Show/Hide API payload
- Copy button copies APA tables in both plain text and HTML format for paste into Excel/Word (formatted headers/borders).

## Demo page

`docs/demo.html` demonstrates CDN usage and local dev build usage:

- Live demo: https://winm2m.github.io/react-stats-ui/demo.html

- `?dev=true` loads `/dist/index.js`
- otherwise loads published package from npm via ESM CDN
- includes demo selectors for:
  - Theme: `light` / `dark`
  - Layout: `full` / `minimal`

## Storybook

Scripts:

```bash
npm run storybook
npm run build-storybook
npm run test
npm run test:ci
```

CI runs `typecheck`, `test:ci`, and `build` automatically on push/PR via `.github/workflows/ci.yml`.

Story file: `src/stats-workbench.stories.tsx`

Interactive controls include:

- `Section Layout`: `full` / `minimal`
- `Language`: `en` / `ar` / `zh` / `fr` / `ru` / `es` / `ko` / `ja` / `vi`
- `Theme`: `light` / `dark` / `custom`
- `Background`
- `Background Transparent`
- `Text`
- `Border`
- `Major`
- `Minor`
- `Warning`
- `Error`
- `Info`
- `Rounded Edges`

Theme behavior:

- Selecting `light` or `dark` applies a preset palette.
- Editing any themed color while `light`/`dark` is active switches mode to `custom`.

## Notes

- Internal UI uses Radix primitives and `lucide-react` icons.
- Worker URL can be controlled via `window.__WINM2M_INFERENTIAL_WORKER_URL__`.
- The component is designed to fill the parent container.

## Project metadata

- Contribution guide: `CONTRIBUTING.md`
- Citation metadata: `CITATION.cff`
