import type { Prefs } from "./types";

export function applyPrefs(prefs: Prefs) {
  const root = document.documentElement;
  root.setAttribute("data-theme", prefs.theme);
  root.setAttribute("data-glass", prefs.glass ? "1" : "0");
  root.setAttribute("data-has-bg", prefs.backgroundId ? "1" : "0");
  root.style.setProperty("--accent", prefs.accent);
  root.style.setProperty("--accent2", prefs.accent2);
  root.style.setProperty("--app-bg-image", prefs.backgroundId ? `url(/api/media/${prefs.backgroundId})` : "none");
  root.style.setProperty("--app-bg-dim", `${prefs.bgDim}%`);
  root.style.setProperty("--app-bg-blur", `${prefs.bgBlur}px`);
  root.style.fontSize = `${prefs.fontScale}%`;
  try {
    localStorage.setItem("cc-prefs", JSON.stringify(prefs));
  } catch {
    /* navegação privada sem storage */
  }
}

export const EARLY_PREFS_SCRIPT = `try{var p=JSON.parse(localStorage.getItem('cc-prefs')||'null');if(p){var r=document.documentElement;r.setAttribute('data-theme',p.theme);r.setAttribute('data-glass',p.glass?'1':'0');r.setAttribute('data-has-bg',p.backgroundId?'1':'0');r.style.setProperty('--accent',p.accent);r.style.setProperty('--accent2',p.accent2);if(/^[0-9a-f-]{36}$/.test(p.backgroundId||''))r.style.setProperty('--app-bg-image','url(/api/media/'+p.backgroundId+')');r.style.setProperty('--app-bg-dim',p.bgDim+'%');r.style.setProperty('--app-bg-blur',p.bgBlur+'px');r.style.fontSize=p.fontScale+'%'}}catch(e){}`;
