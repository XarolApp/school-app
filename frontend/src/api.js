import { supabase } from './supabaseClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  // The backend answers 402 when the trial is over and there is no
  // subscription. Pages use this to show the paywall instead of an error.
  get isPaymentRequired() {
    return this.status === 402;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
}

async function request(path, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = { ...options.headers };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (res.status === 204) return null;

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      body.error || `Požadavek selhal (${res.status})`,
      res.status,
      body.code
    );
  }

  return body;
}

export function fetchMe() {
  return request('/api/me');
}

export function updateProfile({ name }) {
  return request('/api/me', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export function deleteAccount() {
  return request('/api/me', { method: 'DELETE' });
}

export function fetchSchools() {
  return request('/api/schools');
}

export function fetchSchool(id) {
  return request(`/api/schools/${id}`);
}

export function fetchFavorites() {
  return request('/api/favorites');
}

export function addFavorite(schoolId) {
  return request('/api/favorites', {
    method: 'POST',
    body: JSON.stringify({ schoolId }),
  });
}

export function removeFavorite(schoolId) {
  return request(`/api/favorites/${schoolId}`, { method: 'DELETE' });
}

export function createCheckoutSession() {
  return request('/api/checkout', { method: 'POST' });
}

// Questions, this month's remaining runs, the set currently used for scoring
// (`active`) and the list of every set (`runs`). Reading results costs nothing —
// only submitting new answers calls the AI.
export function fetchQuestionnaire() {
  return request('/api/questionnaire');
}

export function submitQuestionnaire(answers) {
  return request('/api/questionnaire', {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}

export function fetchRun(id) {
  return request(`/api/questionnaire/runs/${id}`);
}

// Empty string clears the name — the set falls back to being labelled by its
// date, which it always can be.
export function renameRun(id, label) {
  return request(`/api/questionnaire/runs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ label }),
  });
}

// Makes this the one set whose answers decide match percentages everywhere.
export function setDefaultRun(id) {
  return request(`/api/questionnaire/runs/${id}/default`, { method: 'PUT' });
}

export function setRunArchived(id, archived) {
  return request(`/api/questionnaire/runs/${id}/archive`, {
    method: 'PATCH',
    body: JSON.stringify({ archived }),
  });
}
