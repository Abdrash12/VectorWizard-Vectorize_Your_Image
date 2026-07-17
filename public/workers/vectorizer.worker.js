import init, { trace_image } from '/wasm/wasm_vectorizer.js';

let isReady = false;

init().then(() => {
  isReady = true;
  postMessage({ type: 'READY' });
});

self.onmessage = (e) => {
  if (!isReady) return;
  // Notice we added 'preset' here
  const { id, pixels, width, height, preset } = e.data;

  try {
    // Pass the preset string down into the Rust Wasm engine
    const svg = trace_image(pixels, width, height, preset);
    postMessage({ type: 'DONE', id, svg });
  } catch (err) {
    postMessage({ type: 'ERROR', id, error: err.toString() });
  }
};