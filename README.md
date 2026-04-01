# @winm2m/react-stats-ui

[![npm version](https://img.shields.io/npm/v/@winm2m/react-stats-ui.svg)](https://www.npmjs.com/package/@winm2m/react-stats-ui)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **The Official React UI Ecosystem for Browser-Native Inferential Statistics.**

`@winm2m/react-stats-ui` is a comprehensive React component and hooks library designed to work seamlessly with [`@winm2m/inferential-stats-js`]([https://github.com/winm2m/inferential-stats-js](https://github.com/winm2m/inferential-stats-js)). It empowers developers and researchers to build privacy-preserving, serverless statistical dashboards and survey platforms directly in the browser.

## 🌟 Why this library? (Academic & Research Focus)

Traditionally, extracting statistical results and formatting them into academic papers is a tedious and error-prone process. Furthermore, sending sensitive survey data to external servers compromises data privacy. This library solves these challenges by providing:

- **Zero-Latency & Privacy-First:** All heavy mathematical computations are executed locally via WebAssembly and Web Workers. Your data never leaves the browser.
- **APA-Formatted Tables:** Out-of-the-box UI components that render results (e.g., T-Tests, ANOVA, Factor Analysis) in strict **APA (American Psychological Association) style**, ready to be copy-pasted into research papers.
- **Headless Hooks Architecture:** Full control over your UI. Use our pre-built tables, or use our `useInferentialStats()` hooks to build your own custom data visualizations.
- **Export Ready:** Built-in capabilities to export rendered tables and charts to `.csv`, `.xlsx`, or high-resolution images.
- **Accessible (a11y):** Screen-reader friendly tables and semantic HTML to ensure inclusive research environments.

## 📦 Installation

You need to install both the UI library and the core statistical engine.

```bash
npm install @winm2m/react-stats-ui @winm2m/inferential-stats-js
```

## 🚀 Quick Start

Wrap your application (or the specific analytical route) with the `<StatsProvider>` to initialize the Pyodide Web Worker environment asynchronously.

### 1. Provider Setup

```tsx
import React, { Suspense } from 'react';
import { StatsProvider } from '@winm2m/react-stats-ui';

function App() {
  return (
    // The Provider handles Web Worker initialization and Python package loading
    <StatsProvider>
      <Suspense fallback={<p>Loading statistical engine...</p>}>
        <Dashboard />
      </Suspense>
    </StatsProvider>
  );
}
```

### 2. Using Hooks & APA Components

Easily perform an Independent T-Test and render the result in an academic format.

```tsx
import React from 'react';
import { useTTest, APATable } from '@winm2m/react-stats-ui';
import { surveyData } from './data';

function Dashboard() {
  const { calculate, result, isComputing, error } = useTTest();

  const handleRunAnalysis = async () => {
    await calculate({
      data: surveyData,
      groupVar: 'gender',
      testVars: ['satisfaction_score'],
      equalVar: true
    });
  };

  return (
    <div>
      <button onClick={handleRunAnalysis} disabled={isComputing}>
        {isComputing ? 'Computing in Worker...' : 'Run T-Test'}
      </button>

      {error && <div className="error">{error.message}</div>}

      {/* Renders a beautiful, copy-paste ready APA formatted table */}
      {result && <APATable type="t-test" data={result} exportable />}
    </div>
  );
}
```

## 🏗️ Architecture: Separation of Concerns

This project enforces a strict separation between the computation engine and the view layer:
- **Core (`@winm2m/inferential-stats-js`):** Handles WebAssembly, Pyodide, Buffer serialization, and Pandas/SciPy mathematical logic.
- **UI (`@winm2m/react-stats-ui`):** Handles React state management, suspense/transitions, and academic UI rendering.

## 🤝 Contributing

We welcome contributions from researchers, statisticians, and developers! Please read our [Contributing Guidelines](./CONTRIBUTING.md) to learn how to propose bugfixes, new UI components, or new statistical hooks.

## 📄 License

MIT License © 2026 Youngjune Kwon (WinM2M)
