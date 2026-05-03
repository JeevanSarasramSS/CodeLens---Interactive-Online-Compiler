# Interactive Compiler Visualization Platform

## 📖 About the Project

The **Interactive Compiler Visualization Platform** is an educational and analytical web application designed to demystify the inner workings of a compiler. It provides a highly interactive interface where users can write code, run it, and visualize every step of the compilation pipeline in real-time. By breaking down the complex process of compiling code into understandable phases, this platform serves as an excellent tool for students, educators, and language enthusiasts.

The application uses a client-server architecture, with a modern React frontend for the user interface and a Node.js/Express backend that handles the actual compilation and analysis logic.

---

## ✨ Features

The platform offers a comprehensive suite of features to explore the compilation process:

*   **Interactive Code Editor:** A fully-featured code editor powered by Monaco Editor, supporting standard input (stdin) and keyboard shortcuts.
*   **Live Tokenization:** As you type, the editor instantly analyzes and highlights lexical tokens, providing immediate feedback.
*   **Bidirectional Mapping:** Clicking on a token in the visualization panel highlights the corresponding code in the editor, and moving the cursor in the editor highlights the corresponding token.
*   **End-to-End Compilation Phases Visualization:** The core feature is the ability to break down compilation into its fundamental phases, visualized across dedicated tabs:
    *   🔤 **Lexical Analysis (Tokens):** Breaks the raw code into meaning tokens.
    *   🌳 **Syntax Analysis (AST):** Visualizes the Abstract Syntax Tree.
    *   🔍 **Semantic Analysis:** Displays scope, type checking, and variable tracking.
    *   ⚙️ **Intermediate Representation (IR):** Shows the generated low-level intermediate code.
    *   🔀 **Control Flow Graph (CFG):** Visualizes the execution paths and basic blocks of the program.
    *   🚀 **Optimization:** Demonstrates applied code optimizations.
    *   📤 **Output:** Displays the final execution results or compilation errors.
    *   💡 **Explanation:** Provides AI-driven or rule-based explanations of the code structure.
*   **Template Library:** Includes pre-built code templates that demonstrate specific compiler concepts or edge cases.
*   **Real-time Status and Notifications:** A status bar tracks cursor position and compiler statistics (e.g., token count, IR instruction count), while toast notifications provide instant feedback on compilation success or failure.

---

## 📁 Project Structure

The repository is organized into a monorepo structure with distinct `client` and `server` workspaces:

### Frontend (`/client`)
Built with **React**, **Vite**, and **Monaco Editor**.
*   **`src/components/`**: Contains the modular UI components, including the code editor, phase navigation, and dedicated panels for each compiler phase (e.g., `TokensPanel`, `ASTPanel`, `CFGPanel`).
*   **`src/utils/`**: Utility functions, including the API client (`api.js`) for communicating with the backend.
*   **`src/App.jsx`**: The main application component that manages state, tab switching, and coordinates communication between the editor and the analysis panels.
*   **`src/index.css` & `src/App.css`**: Global styles and theme definitions.

### Backend (`/server`)
Built with **Node.js** and **Express**.
*   **`src/index.js`**: The main entry point for the Express server.
*   **`src/routes/`**: Defines the API endpoints (`/api/compile`, `/api/analyze`) that the frontend consumes.
*   **`src/compiler/`**: Contains the core logic for parsing, analyzing, and executing the code. This directory is responsible for generating the data structures (Tokens, AST, IR, CFG) that are visualized on the frontend.

---

## 🛠️ Technology Stack

*   **Frontend:** React 19, Vite, Monaco Editor (@monaco-editor/react)
*   **Backend:** Node.js, Express
*   **Communication:** REST APIs via standard HTTP requests
