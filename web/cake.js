// Load the bundled Three.js runtime once; no CDN or network dependency.
let threeReady;
export function loadThree() {
  if (window.THREE) return Promise.resolve(window.THREE);
  if (!threeReady) threeReady = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL("./vendor/three-r128.min.js", import.meta.url).href;
    script.onload = () => resolve(window.THREE);
    script.onerror = () => { script.remove(); threeReady = null; reject(new Error("三维组件加载失败，请刷新后重试")); };
    document.head.append(script);
  });
  return threeReady;
}
