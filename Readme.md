#  Vector Wizard

**Vector Wizard** is a blazing-fast, privacy-first image vectorization tool. It converts raster images (PNG, JPG) into infinitely scalable vector graphics (SVG) entirely inside your browser using a custom Rust-based WebAssembly (Wasm) engine. 

Because the mathematical processing happens client-side, your images are never uploaded to a server—guaranteeing 100% privacy and zero server latency.

---

## Features

* **100% Local & Private:** Your images never leave your device. The conversion happens on your CPU via WebAssembly.
* **Blazing Fast:** Leveraging Rust and Web Workers, the UI remains perfectly smooth while heavy Wasm calculations run in the background.
* **Intelligent Presets:** Fine-tuned mathematical models designed for different image types (Logos, Anime, Photos, Sketches).
* **Beautiful UI:** A stunning Glassmorphism interface backed by a custom Three.js WebGL shader.

---

## 🛠️ Tech Stack

### Frontend
* **Framework:** Next.js 16 (React)
* **Styling:** Tailwind CSS
* **Graphics:** Three.js (WebGL Shader Background)
* **Icons:** Lucide React

### Engine (Core)
* **Language:** Rust 
* **Compilation Target:** WebAssembly (Wasm)
* **Vectorization Algorithms:** `visioncortex` / `vtracer`
* **Concurrency:** Web Workers API

### Deployment
* **Hosting:** Render (Node.js Environment)

---

## Conversion Presets

Unlike basic auto-tracers, Vector Wizard uses distinct mathematical approaches based on your input image:

1.  **Exact Fidelity:** Pixel-perfect tracing. Disables artificial smoothing and stops the engine from merging colors. Best for preserving exact original geometry.
2.  **Logo & Badge:** Uses Spline curves to create perfectly smooth circular lines. Ideal for typography, icons, and low-res crests.
3.  **Anime & Comic:** Uses Polygon tracing and aggressive color snapping to merge gray anti-aliased edge pixels into solid comic-book ink.
4.  **Photograph:** Smooths out camera noise/grain and intelligently clusters colors to keep the SVG file size manageable.
5.  **Black & White Sketch:** Strict binary tracing designed to extract raw ink lines from white paper backgrounds.

---

## Local Development Setup

Want to run Vector Wizard locally or contribute to the engine? Here is how to set it up.

### Prerequisites
1. **Node.js** (v18+)
2. **Rust** (Install via [rustup](https://rustup.rs/))
3. **wasm-pack** (Run `cargo install wasm-pack`)

### 1. Clone the Repository
```bash
git clone [https://github.com/abdrash12/vector-wizard.git](https://github.com/abdrash12/vector-wizard.git)
cd vector-wizard
```
### 2. Compile the Rust Engine
The WebAssembly engine must be compiled and placed into the Next.js public folder.

``` Bash
wasm-pack build crates/vectorizer --target web --out-dir public/wasm
```
### 3. Install Dependencies
``` Bash
npm install
```
# Also install Three.js if you haven't globally: npm install three
### 4. Run the Development Server
Note: We force the Webpack engine because Turbopack does not yet fully support custom WebAssembly configurations.

``` Bash
npm run dev --webpack
```
Open http://localhost:3000 in your browser.

### Contributing
Vector Wizard is fully open-source! Whether it's adding new tracing presets in Rust, improving the React UI, or writing better WebGL shaders, contributions are welcome.

Fork the repository.

Create a feature branch (git checkout -b feature/amazing-new-preset).

Commit your changes (git commit -m 'Add awesome preset').

Push to the branch (git push origin feature/amazing-new-preset).

Open a Pull Request.

### 📄 License
This project is licensed under the MIT License. See the LICENSE file for details.
