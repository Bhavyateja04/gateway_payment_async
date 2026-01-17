# React + Vite

This template provides a minimal setup to get **React** working in **Vite** with **HMR (Hot Module Replacement)** and some basic **ESLint** rules.

---

## Plugins for React

Two official plugins are available:

### `@vitejs/plugin-react`
Uses:
- **Babel**
- Or **oxc** when used in [rolldown-vite](https://vite.dev/guide/rolldown)

Provides:
- **Fast Refresh**

GitHub:
https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react

---

### `@vitejs/plugin-react-swc`
Uses:
- **SWC (Rust-based compiler)**

Provides:
- **Fast Refresh**

GitHub:
https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react-swc

---

## React Compiler

The **React Compiler** is not enabled in this template due to its impact on **development** and **build performance**.

If you want to add it, follow this guide:

https://react.dev/learn/react-compiler/installation

---

## ESLint Configuration

If you're developing a **production application**, it's recommended to:

✔ Use **TypeScript**  
✔ Enable **type-aware lint rules**

Refer to the TypeScript React template:

https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts

Learn more about TypeScript ESLint:

https://typescript-eslint.io

---
