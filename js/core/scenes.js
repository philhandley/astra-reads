// Soft vector backdrops, one per theme, shown behind every picture and left showing if a picture is missing.
const SCENES = {
  dino: `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice"><rect width="160" height="90" fill="#fde9d2"/><circle cx="128" cy="22" r="10" fill="#ffd9a8"/><path d="M0 62l30-30 22 24 18-18 30 26 20-14 40 20v20H0z" fill="#f4c89a"/><path d="M80 56l14-26 14 26z" fill="#e8a46a"/><path d="M0 70c30-8 60 6 90-2s50-4 70 2v20H0z" fill="#e59a5c"/><path d="M0 90V78c20-6 40 4 60-2s40-6 60 0 30 4 40 0v14z" fill="#d8823f"/></svg>`,
  space: `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice"><rect width="160" height="90" fill="#efe8ff"/><circle cx="24" cy="18" r="1.2" fill="#fff"/><circle cx="60" cy="10" r=".9" fill="#fff"/><circle cx="110" cy="14" r="1.1" fill="#fff"/><circle cx="140" cy="28" r=".8" fill="#fff"/><circle cx="90" cy="26" r=".7" fill="#fff"/><circle cx="132" cy="18" r="6" fill="#d9ccf7"/><path d="M0 60c25-10 45 6 70-2s45-12 90 2v30H0z" fill="#d4c3f4"/><path d="M0 72c30-6 55 8 85 0s45-6 75 2v16H0z" fill="#b9a6ea"/></svg>`,
  wild: `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice"><rect width="160" height="90" fill="#e3f3e7"/><path d="M0 58l28-30 22 22 20-26 30 30 22-18 38 22v32H0z" fill="#c6e6cf"/><path d="M0 68c30-10 50 8 80-2s50-6 80 4v20H0z" fill="#9fd4ae"/><path d="M0 90V80c25-8 45 6 70-2s45-4 90 2v10z" fill="#6fbd86"/></svg>`,
  ocean: `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice"><rect width="160" height="90" fill="#dcefff"/><path d="M0 14c20 6 40-6 60 0s40 6 60 0 30-4 40 0v76H0z" fill="#c4e2fb"/><circle cx="30" cy="60" r="2" fill="#fff" opacity=".7"/><circle cx="36" cy="50" r="1.3" fill="#fff" opacity=".7"/><circle cx="120" cy="66" r="1.6" fill="#fff" opacity=".7"/><path d="M0 76c20-8 40 6 60-2s40-10 60 0 30 4 40 0v16H0z" fill="#9ccbf2"/><path d="M0 90V84c25-6 50 4 75-2s45-2 85 2v6z" fill="#6fb1e6"/></svg>`,
};

export function sceneSVG(theme) {
  return `<div class="scene" aria-hidden="true">${SCENES[theme] || SCENES.dino}</div>`;
}
