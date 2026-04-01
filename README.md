# @winm2m/react-stats-ui

React UI component for running browser-based inferential statistics with `@winm2m/inferential-stats-js`.

## Installation

```bash
npm install @winm2m/react-stats-ui @winm2m/inferential-stats-js
```

## What it provides

- Import `.xlsx` files and store datasets in IndexedDB.
- Browse, select, and delete stored datasets.
- Assign variables to analysis roles using drag-and-drop or arrow buttons.
- Run supported analyses:
  - Independent Samples T-Test
  - Multiple Regression
  - Factor Analysis
- Show real-time validation feedback for invalid role assignments.
- Toggle a JSON payload viewer to inspect the object sent to analysis execution.

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

## Demo page

`demo.html` in this repository demonstrates CDN usage (assuming the package is published on npm):

- Loads React and `@winm2m/react-stats-ui` with ESM CDN imports.
- Uses Tailwind CDN for utility classes.
- Mounts `<StatsWorkbench />` into a full-page container.

## Notes

- The component uses Radix UI primitives and `lucide-react` icons internally.
- The component fills its parent area with `width: 100%` and `height: 100%`.
- Default execution tries to call compatible functions from `@winm2m/inferential-stats-js`.
- If your project uses a custom execution API, pass `analysisExecutor` to `StatsWorkbench`.
