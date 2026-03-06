# 🛠️ FrameKit

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Design System](https://img.shields.io/badge/design-atomic-orange.svg)

**FrameKit** is a modern, ultra-lightweight **Atomic Design Toolkit** engineered for developers who demand professional, scalable web interfaces without the overhead of heavy frameworks.

---

## 🚀 Why FrameKit?

FrameKit merges the power of **Pure JavaScript utilities** with a **Modular CSS architecture**. It serves as the structural backbone for your web projects, focusing on:

* **Atomic Design Philosophy:** From the smallest UI atoms to complex organisms.
* **Zero Dependencies:** 100% Vanilla JS and Modern CSS.
* **Performance First:** Minimal footprint. Only import what you actually use.
* **Developer Experience:** Clean naming conventions and a highly intuitive API.

---

## 📦 What's Inside?

### 🧠 Core JS (Logic)
* **BrowserStorage:** A robust, unified interface for `localStorage` and `sessionStorage` featuring smart error handling and data persistence.

### 🎨 Core CSS (Style)
* **Design Tokens:** Centralized CSS variables for colors, typography, and spacing (`tokens.css`).
* **Layout Engine:** High-performance Flexbox and CSS Grid utilities (`layout.css`).
* **Master Entry:** A single entry point to inject the entire design system into your project.

---

## ⚡ Quick Start

### 1. Style Integration (CDN)
Include the master stylesheet in your `<head>` to activate the FrameKit design system instantly:

```html
<link rel="stylesheet" href="[https://1dkvr.github.io/FrameKit/core/css/master.css](https://1dkvr.github.io/FrameKit/core/css/master.css)">
```

### 2. JS Utilities
Import the storage engine directly into your scripts:

```Javascript
import BrowserStorage from '[https://1dkvr.github.io/FrameKit/core/js/BrowserStorage.js](https://1dkvr.github.io/FrameKit/core/js/BrowserStorage.js)';

const store = new BrowserStorage('myApp', 'local');
store.set('theme', 'dark');
```

## 📂 Architecture

```
FrameKit/
├── core/
│   ├── js/       # Logic & Utilities (Storage, API, Helpers)
│   └── css/      # Global Styles (Tokens, Reset, Layout, Master)
└── components/   # UI Elements (Atoms, Molecules, Organisms)
```

## 🛠️ SEO & Tags

Looking for a high-efficiency alternative to pre-existing frameworks? FrameKit offers a refined equilibrium between granular control and pre-established structures, optimized for modern web standards.

`#Framework` `#CSS` `#JavaScript` `#AtomicDesign` `#Frontend` `#WebDev` `#OpenSource` `#DesignSystem`

## 🤝 License & Contribution
FrameKit is an open-source project released under the Apache License 2.0. You are free to fork, modify, and use it for both personal and commercial projects.

Engineered with ❤️ by [1D](https://github.com/1DKVR)
