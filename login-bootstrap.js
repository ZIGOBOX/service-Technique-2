(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  let busy = false;

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const existing = [...document.scripts].find((s) => s.src === url);
      if (existing) {
        if (window.supabase) return resolve();
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Impossible de charger le module de connexion.'));
      document.head.appendChild(script);
    });
  }

  async function ensureSupabase() {
    if (!window.supabase) {
      const sources = [
        'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
        'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js'
      ];
      let lastError;
      for (const source of sources) {
        try {
          await loadScript(source);
          if (window.supabase) break;
        } catch (error) {
          lastError = error;
        }
      }
      if (!window.supabase) throw lastError || new Error('Module de connexion indisponible.');
    }
    const config = window.SUPABASE_CONFIG || {};
    if (!config.url || !config.publishableKey) throw new Error('Configuration Supabase absente.');
    return window.supabase.createClient(config.url, config.publishableKey);
  }

  async function submitLogin(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (busy) return false;
    const email = $('authEmail')?.value.trim() || '';
    const password = $('authPassword')?.value || '';
    const button = $('authLogin');
    const errorBox = $('authError');
    if (!email) {
      if (errorBox) errorBox.textContent = 'Saisissez votre adresse e-mail.';
      $('authEmail')?.focus();
      return false;
    }
    if (!password) {
      if (errorBox) errorBox.textContent = 'Saisissez votre mot de passe.';
      $('authPassword')?.focus();
      return false;
    }
    busy = true;
    if (button) { button.disabled = true; button.textContent = 'Connexion…'; }
    if (errorBox) errorBox.textContent = '';
    try {
      const client = await ensureSupabase();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data?.session) throw new Error('Connexion non confirmée.');
      location.reload();
    } catch (error) {
      console.error('Connexion V48', error);
      if (errorBox) {
        errorBox.textContent = error?.message === 'Invalid login credentials'
          ? 'Adresse ou mot de passe incorrect.'
          : (error?.message || 'Connexion impossible.');
      }
      busy = false;
      if (button) { button.disabled = false; button.textContent = 'Se connecter'; }
    }
    return false;
  }

  function bind() {
    const form = $('authForm');
    const button = $('authLogin');
    if (!form || !button || form.dataset.loginBound === '1') return;
    form.dataset.loginBound = '1';
    form.addEventListener('submit', submitLogin, { capture: true });
    button.addEventListener('click', submitLogin, { capture: true });
    button.addEventListener('pointerup', (event) => {
      if (event.pointerType === 'touch') submitLogin(event);
    }, { capture: true });
    $('authPassword')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') submitLogin(event);
    });
    window.PSTLoginSubmit = submitLogin;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
  window.addEventListener('load', bind, { once: true });
})();
