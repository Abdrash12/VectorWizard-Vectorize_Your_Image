'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, Loader2, Download, Wand2, Settings2 } from 'lucide-react';
import * as THREE from 'three';

// --- BACKGROUND SHADER COMPONENT ---
function WebGLShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene | null;
    camera: THREE.OrthographicCamera | null;
    renderer: THREE.WebGLRenderer | null;
    mesh: THREE.Mesh | null;
    uniforms: any;
    animationId: number | null;
  }>({
    scene: null,
    camera: null,
    renderer: null,
    mesh: null,
    uniforms: null,
    animationId: null,
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const { current: refs } = sceneRef;

    const vertexShader = `
      attribute vec3 position;
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform float xScale;
      uniform float yScale;
      uniform float distortion;

      void main() {
        vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
        
        float d = length(p) * distortion;
        
        float rx = p.x * (1.0 + d);
        float gx = p.x;
        float bx = p.x * (1.0 - d);

        float r = 0.05 / abs(p.y + sin((rx + time) * xScale) * yScale);
        float g = 0.05 / abs(p.y + sin((gx + time) * xScale) * yScale);
        float b = 0.05 / abs(p.y + sin((bx + time) * xScale) * yScale);
        
        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `;

    const initScene = () => {
      refs.scene = new THREE.Scene();
      refs.renderer = new THREE.WebGLRenderer({ canvas });
      refs.renderer.setPixelRatio(window.devicePixelRatio);
      refs.renderer.setClearColor(new THREE.Color(0x000000));

      refs.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, -1);

      refs.uniforms = {
        resolution: { value: [window.innerWidth, window.innerHeight] },
        time: { value: 0.0 },
        xScale: { value: 1.0 },
        yScale: { value: 0.5 },
        distortion: { value: 0.05 },
      };

      const position = [
        -1.0, -1.0, 0.0,
         1.0, -1.0, 0.0,
        -1.0,  1.0, 0.0,
         1.0, -1.0, 0.0,
        -1.0,  1.0, 0.0,
         1.0,  1.0, 0.0,
      ];

      const positions = new THREE.BufferAttribute(new Float32Array(position), 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", positions);

      const material = new THREE.RawShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: refs.uniforms,
        side: THREE.DoubleSide,
      });

      refs.mesh = new THREE.Mesh(geometry, material);
      refs.scene.add(refs.mesh);

      handleResize();
    };

    const animate = () => {
      if (refs.uniforms) refs.uniforms.time.value += 0.01;
      if (refs.renderer && refs.scene && refs.camera) {
        refs.renderer.render(refs.scene, refs.camera);
      }
      refs.animationId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      if (!refs.renderer || !refs.uniforms) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      refs.renderer.setSize(width, height, false);
      refs.uniforms.resolution.value = [width, height];
    };

    initScene();
    animate();
    window.addEventListener("resize", handleResize);

    return () => {
      if (refs.animationId) cancelAnimationFrame(refs.animationId);
      window.removeEventListener("resize", handleResize);
      if (refs.mesh) {
        refs.scene?.remove(refs.mesh);
        refs.mesh.geometry.dispose();
        if (refs.mesh.material instanceof THREE.Material) {
          refs.mesh.material.dispose();
        }
      }
      refs.renderer?.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      // Added -z-10 to lock it behind the UI
      className="fixed top-0 left-0 w-full h-full block -z-10 pointer-events-none"
    />
  );
}

// --- MAIN APPLICATION INTERFACE ---
export default function Home() {
  const [engineReady, setEngineReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [svgData, setSvgData] = useState<string | null>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [preset, setPreset] = useState<string>('logo');
  
  const workerRef = useRef<Worker | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    workerRef.current = new Worker('/workers/vectorizer.worker.js', { type: 'module' });
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'READY') {
        setEngineReady(true);
      } else if (e.data.type === 'DONE') {
        setSvgData(e.data.svg);
        setIsProcessing(false);
      } else if (e.data.type === 'ERROR') {
        alert("Rust Engine Error: " + e.data.error);
        setIsProcessing(false);
      }
    };
    return () => workerRef.current?.terminate();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setSvgData(null); 
    }
  };

  const processImage = () => {
    if (!selectedFile || !engineReady || !workerRef.current || !canvasRef.current) return;
    setIsProcessing(true);

    const img = new Image();
    img.src = URL.createObjectURL(selectedFile);
    
    img.onload = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const pixels = new Uint8Array(imageData.data.buffer);

      workerRef.current!.postMessage({
        id: Date.now(),
        pixels,
        width: img.width,
        height: img.height,
        preset: preset 
      });
    };
  };

  return (
    <main className="min-h-screen text-white py-12 px-6 relative">
      {/* 1. Mount the Shader Background */}
      <WebGLShader />

      {/* 2. Glassmorphism UI Wrapper */}
      <div className="max-w-5xl mx-auto space-y-10 relative z-10">
        
        <div className="text-center pt-8">
          <h1 
            style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
            className="text-5xl md:text-6xl font-extrabold text-white tracking-tight drop-shadow-xl"
          >
            Vector Wizard
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT COLUMN: Controls */}
          <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/10 space-y-6 h-fit shadow-2xl">
            
            {/* Upload */}
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-slate-300 uppercase mb-3 flex items-center gap-2"><Upload className="w-4 h-4"/> Select Image</h3>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                className="block w-full text-sm text-slate-300 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer border border-white/10 rounded-xl p-2 bg-black/20" 
              />
            </div>

            {/* Preset Selection */}
            <div className={`transition-opacity ${!selectedFile ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <h3 className="text-sm font-semibold tracking-wide text-slate-300 uppercase mb-3 flex items-center gap-2"><Settings2 className="w-4 h-4"/> Choose Style</h3>
              <select 
                value={preset} 
                onChange={(e) => setPreset(e.target.value)}
                className="w-full bg-black/40 border border-white/10 text-white text-sm rounded-xl p-3 outline-none focus:border-white/30 backdrop-blur-md appearance-none"
              >
                <option value="exact">Exact Fidelity (Pixel-Perfect, highest accuracy)</option>
                <option value="logo">Logo & Badge (Smooth spline curves)</option>
                <option value="anime">Anime & Comic (Straight polygon edges)</option>
                <option value="photo">Photograph (Smooths noise & manages size)</option>
                <option value="bw">Black & White Sketch (Strict ink lines)</option>
              </select>
            </div>

            {/* Action */}
            <button 
              onClick={processImage}
              disabled={!selectedFile || !engineReady || isProcessing}
              className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 disabled:bg-white/10 disabled:text-white/40 font-bold py-3.5 px-4 rounded-xl transition shadow-lg"
            >
              {!engineReady ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Booting Engine...</>
              ) : isProcessing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Tracing Vectors...</>
              ) : (
                <><Wand2 className="w-5 h-5"/> Vectorize Image</>
              )}
            </button>
          </div>

          {/* RIGHT COLUMN: Viewport */}
          <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/10 flex flex-col shadow-2xl">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold tracking-wide text-slate-300 uppercase">Output Viewport</h3>
                {svgData && (
                  <a href={`data:image/svg+xml;utf8,${encodeURIComponent(svgData)}`} download="vectorized.svg" className="flex items-center gap-2 text-xs bg-white/10 hover:bg-white/20 border border-white/10 text-white px-4 py-2 rounded-lg font-medium transition backdrop-blur-md">
                    <Download className="w-4 h-4" /> Download SVG
                  </a>
                )}
             </div>
             
             {/* Transparency background for images so dark lines are visible */}
             <div className="flex-1 min-h-[400px] bg-black/40 rounded-xl overflow-hidden flex items-center justify-center border border-white/5 relative p-4"
                  style={{
                    backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.02) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.02) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.02) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.02) 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                  }}
             >
                {!selectedFile && !svgData && <span className="text-white/30 text-sm font-medium">No image selected</span>}
                
                {previewUrl && !svgData && (
                  <img src={previewUrl} className={`max-w-full max-h-full object-contain ${isProcessing ? 'opacity-20' : 'opacity-100'} transition-opacity duration-500`} alt="Original" />
                )}

                {svgData && (
                  <div dangerouslySetInnerHTML={{ __html: svgData }} className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain drop-shadow-md" />
                )}
             </div>
          </div>

        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </main>
  );
}