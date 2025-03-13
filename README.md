# RWA Studio

RWA Studio is an integrated development environment for building and managing ownables.

## Build Environment

RWA Studio provides a comprehensive build environment for compiling Rust code to WebAssembly and packaging it as an ownable. The build process includes:

### Build Methods

- **Simulation**: Simulates the build process without actual compilation. This is useful for testing the UI and workflow without requiring a Rust compiler.
- **Server-side Compilation**: Uses a remote server to compile Rust to WebAssembly. This allows for building ownables without requiring a local Rust installation.
- **GitHub Actions**: Uses GitHub Actions to compile and package your ownable. This method leverages GitHub's infrastructure for building ownables.

### Build Process

The build process consists of the following steps:

1. **Collect Project Files**: Gathers all the necessary files from your project, including Rust source files, configuration files, and assets.
2. **Compile Rust to WebAssembly**: Uses `wasm-pack` to compile your Rust code to WebAssembly.
3. **Generate JSON Schemas**: Creates JSON schemas for contract interaction, including instantiate, execute, and query schemas.
4. **Create Package Structure**: Organizes the compiled output into a standard package structure.
5. **Generate Final Package**: Creates a zip file containing the compiled WebAssembly, JavaScript bindings, JSON schemas, and source files.

### Package Structure

The final package has the following structure:

```
pkg/
├── {package_name}.js
├── {package_name}.d.ts
├── {package_name}_bg.wasm
└── {package_name}_bg.wasm.d.ts
schema/
├── instantiate.json
├── execute.json
└── query.json
src/
└── (Rust source files)
assets/
└── (Asset files)
```

### Content Identifier (CID)

Each ownable package is assigned a unique Content Identifier (CID) based on its content. This CID can be used to reference the package in a decentralized storage system.

## Getting Started

1. Create a new project or open an existing one.
2. Add your Rust files, assets, and configuration files.
3. Click the "Build" button to open the Build Sandbox.
4. Choose your preferred build method.
5. Click "Build & Download" to start the build process.
6. Monitor the build progress in the "Build Process" tab.
7. Once the build is complete, the package will be downloaded automatically.

## Requirements

- For local development: Rust, wasm-pack, and Node.js
- For server-side compilation: A valid server endpoint
- For GitHub Actions: A GitHub account and personal access token with appropriate permissions

## License

[MIT License](LICENSE)

---

## 🚀 Overview

RWA Studio is a **browser-based platform** for creating **Real-World Assets (RWAs)** such as LTO Ownables. Users can select a template, upload assets, and generate Ownables embedded with **CosmWasm smart contracts** – all without leaving the browser.

## 📦 Installation & Setup

### **1️⃣ Clone the Repository**

```sh
git clone <repo-url>
cd rwa-studio
```

### **2️⃣ Install Dependencies**

```sh
npm install
```

### **3️⃣ Start Development Server**

```sh
npm run dev
```

> Open `http://localhost:5173/` in your browser.

### **4️⃣ Build for Production**

```sh
npm run build
```

### **5️⃣ Lint & Format Code**

```sh
npm run lint
```

---

## 📄 Contributing

1. **Fork the repo**.
2. **Create a new branch** (`git checkout -b feature-branch`).
3. **Commit changes** (`git commit -m "Add feature XYZ"`).
4. **Push to the branch** (`git push origin feature-branch`).
5. **Open a Pull Request**.

---

## 📜 License

This project is licensed under the **MIT License**.

---
