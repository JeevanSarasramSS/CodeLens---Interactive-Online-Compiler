const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function runCode(code, input = '') {
  const res = await fetch(`${API_BASE}/compile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, input })
  });
  return res.json();
}

export async function analyzeCode(code) {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  return res.json();
}

export async function quickTokenize(code) {
  const res = await fetch(`${API_BASE}/analyze/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  return res.json();
}
