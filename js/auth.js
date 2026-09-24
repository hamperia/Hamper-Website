/* Public credentials only. Passwords are sent directly to Supabase Auth. */
(function () {
  'use strict';
  const base = new URL('../', document.currentScript.src);
  const url = (path = '') => new URL(path, base).href;
  function afterLoginUrl() {
    const path = sessionStorage.getItem('hamperia_after_login');
    sessionStorage.removeItem('hamperia_after_login');
    return url(path && /^[a-z0-9-]+(?:\/[a-z0-9-]+)?\/$/.test(path) ? path : '');
  }
  const client = window.supabase?.createClient(
    'https://gphkitnnjdqbxgwqtjpl.supabase.co',
    'sb_publishable_Wd8x5Y3IFums5TepzzwdSA_kpVcakXO',
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );
  const signupForm = document.querySelector('[data-email-signup-form]');
  const isSignup = Boolean(signupForm);
  const isCallback = window.location.pathname.includes('/auth/callback/') || /access_token=|error_description=/.test(window.location.hash) || new URLSearchParams(window.location.search).has('code');
  let pendingUser = null;
  let busy = false;
  let revision = 0;
  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });
  const state = { session: null, user: null, profile: null, role: 'consumer' };
  window.hamperia = { client, ready, state, adminEmail: 'contact@hamperiasolutions.com', sessionListeners: [], beforeSignOutListeners: [] };

  function promptSignIn(message = 'Sign in to save this to your Hamperia account.') {
    let panel = document.querySelector('[data-signin-prompt]');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'signin-prompt';
      panel.dataset.signinPrompt = '';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.innerHTML = `<div class="signin-prompt-card"><button type="button" class="signin-prompt-close" data-close-signin-prompt aria-label="Close">×</button><h2>Sign in to continue</h2><p data-signin-prompt-message></p><a class="button" href="${url('auth/')}">Sign in or create an account</a></div>`;
      document.body.append(panel);
      panel.addEventListener('click', event => { if (event.target === panel || event.target.closest('[data-close-signin-prompt]')) panel.remove(); });
    }
    panel.querySelector('[data-signin-prompt-message]').textContent = message;
    const relative = window.location.pathname.replace(new URL(url()).pathname, '');
    if (/^[a-z0-9-]+(?:\/[a-z0-9-]+)?\/$/.test(relative)) sessionStorage.setItem('hamperia_after_login', relative);
    panel.querySelector('a').focus();
  }
  window.hamperia.promptSignIn = promptSignIn;

  function status(message, type = '') {
    document.querySelectorAll('[data-auth-status]').forEach((node) => {
      node.textContent = message;
      node.className = `auth-status ${type}`;
      node.hidden = false;
      node.setAttribute('role', type === 'error' ? 'alert' : 'status');
      node.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
      if (type === 'error') {
        node.tabIndex = -1;
        node.focus({ preventScroll: true });
        node.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    });
  }
  function text(selector, value) {
    document.querySelectorAll(selector).forEach((node) => { node.textContent = value || ''; });
  }
  async function profileFor(user) {
    if (!user) return null;
    const { data, error } = await client.from('profiles')
      .select('role, requested_role, display_name, phone, business_name, registration_completed')
      .eq('id', user.id).maybeSingle();
    if (error) throw new Error('Unable to load your saved account. Please try again shortly.');
    return data;
  }
  function prepareSignup(user, profile) {
    if (!signupForm || !user) return;
    signupForm.elements.full_name.value = profile?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || '';
    signupForm.elements.email.value = user.email || '';
    signupForm.elements.email.readOnly = true;
    signupForm.elements.phone.value = profile?.phone || '';
    signupForm.elements.business_name.value = profile?.business_name || '';
    signupForm.elements.account_type.value = profile?.requested_role === 'producer' ? 'producer' : '';
    document.querySelectorAll('[data-google-signup-intro]').forEach((node) => { node.hidden = true; });
    text('[data-signup-heading]', 'Complete your account');
    text('[data-signup-description]', 'Your Google details are filled in. Set your password and choose how you are joining.');
    text('[data-password-signup]', 'Complete signup');
    updateBusinessField();
  }
  function updateBusinessField() {
    if (!signupForm) return;
    const isHost = signupForm.elements.account_type.value === 'producer';
    signupForm.elements.business_name.required = isHost;
    document.querySelector('[data-business-field]').hidden = !isHost;
  }
  async function render(session, profile) {
    const complete = Boolean(session?.user && profile?.registration_completed);
    pendingUser = !complete ? session?.user || null : null;
    Object.assign(state, {
      session: complete ? session : null, user: complete ? session.user : null,
      profile: complete ? profile : null, role: complete ? profile.role : 'consumer'
    });
    document.body.dataset.authenticated = String(complete);
    document.body.dataset.role = state.role;
    document.querySelectorAll('.auth-guest').forEach((node) => { node.hidden = complete; });
    document.querySelectorAll('.auth-user').forEach((node) => { node.hidden = !complete; });
    const fullName = complete ? profile.display_name || session.user.email : '';
    text('.auth-user-name', fullName.trim().split(/\s+/)[0] || 'Account');
    text('.auth-user-email', complete ? session.user.email : '');
    document.querySelectorAll('[data-auth-dashboard]').forEach((node) => {
      node.href = url(state.role === 'admin' ? 'admin/' : state.role === 'producer' ? 'producer/' : 'account/');
      node.textContent = state.role === 'admin' ? 'Admin dashboard' : state.role === 'producer' ? 'Manage products' : 'My account';
    });
    document.querySelectorAll('[data-role-only]').forEach((node) => { node.hidden = !complete || node.dataset.roleOnly !== state.role; });
    document.querySelectorAll('[data-producer-access]').forEach((node) => { node.hidden = !complete || !['producer', 'admin'].includes(state.role); });
    document.querySelectorAll('[data-auth-required]').forEach((node) => { node.hidden = complete; });
    if (pendingUser) prepareSignup(pendingUser, profile);
    if (typeof window.hamperia.onSession === 'function') await window.hamperia.onSession(state);
    for (const listener of window.hamperia.sessionListeners || []) await listener(state);
  }
  function getIntent() {
    if (window.location.pathname.includes('/auth/callback/')) {
      const action = new URLSearchParams(window.location.search).get('action');
      if (['signin', 'signup'].includes(action)) return action;
    }
    try {
      const intent = JSON.parse(sessionStorage.getItem('hamperia_auth_intent'));
      return intent && Date.now() - intent.at < 30 * 60 * 1000 ? intent.action : null;
    } catch { return null; }
  }
  async function sync(session, processReturn = false) {
    const current = ++revision;
    const profile = await profileFor(session?.user);
    if (current !== revision) return;
    const intent = processReturn ? getIntent() : null;
    if (processReturn && (session?.user || isCallback)) sessionStorage.removeItem('hamperia_auth_intent');
    if (processReturn && isCallback && !session?.user) throw new Error('Sign-in was not completed. Please return to Sign in and try again.');
    if (session?.user && !profile?.registration_completed && (intent === 'signin' || (isCallback && intent !== 'signup'))) {
      await client.auth.signOut({ scope: 'local' });
      await render(null, null);
      window.location.replace(url('auth/?notice=signup-required'));
      return;
    }
    await render(session, profile);
    if (session?.user && !profile?.registration_completed && processReturn && (intent === 'signup' || isCallback) && !isSignup) {
      window.location.replace(url('auth/signup/'));
    } else if (profile?.registration_completed && processReturn && (isCallback || intent || isSignup)) {
      window.location.replace(afterLoginUrl());
    }
  }
  async function run(action, form) {
    if (busy) return;
    busy = true;
    const buttons = [...document.querySelectorAll('[data-google-signin], [data-google-signup], form button[type="submit"]')];
    buttons.forEach((node) => { node.disabled = true; });
    try {
      await ready;
      if (!client) throw new Error('Sign-in is unavailable. Check your connection and reload this page.');
      await action(form);
    } catch (error) {
      status(error.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      busy = false;
      buttons.forEach((node) => { node.disabled = false; });
    }
  }
  async function google(action) {
    sessionStorage.setItem('hamperia_auth_intent', JSON.stringify({ action, at: Date.now() }));
    status('Opening Google…');
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google', options: { redirectTo: url('auth/callback/?action=' + action), queryParams: { prompt: 'select_account' } }
    });
    if (error) { sessionStorage.removeItem('hamperia_auth_intent'); throw error; }
  }
  async function signIn(form) {
    status('Signing in…');
    const { data, error } = await client.auth.signInWithPassword({
      email: form.elements.email.value.trim(), password: form.elements.password.value
    });
    if (error) {
      throw new Error(['invalid_credentials', 'user_not_found'].includes(error.code) || /invalid login credentials/i.test(error.message || '')
        ? 'Email or password not recognised. If you have not signed up, choose Create an account below.'
        : error.message);
    }
    const profile = await profileFor(data.user);
    if (!profile?.registration_completed) {
      await client.auth.signOut({ scope: 'local' });
      await render(null, null);
      throw new Error('Signup has not been completed. Choose Create an account below to finish registering.');
    }
    await render(data.session, profile);
    window.location.assign(afterLoginUrl());
  }
  async function signUp(form) {
    const values = Object.fromEntries(new FormData(form));
    if (values.password !== values.confirm_password) throw new Error('The passwords do not match.');
    if (values.password.length < 8) throw new Error('Use at least 8 characters for your password.');
    if (!values.full_name.trim()) throw new Error('Enter your name.');
    if (!['consumer', 'producer'].includes(values.account_type)) throw new Error('Choose Customer or Product host.');
    if (values.account_type === 'producer' && !values.business_name.trim()) throw new Error('Enter your shop or business name.');
    status('Saving your account…');
    const metadata = { full_name: values.full_name.trim(), account_type: values.account_type,
      phone: values.phone.trim(), business_name: values.account_type === 'producer' ? values.business_name.trim() : '',
      signup_submitted: true };
    if (pendingUser) {
      const { error: passwordError } = await client.auth.updateUser({ password: values.password });
      if (passwordError) throw passwordError;
      const { error } = await client.rpc('complete_registration', {
        p_display_name: metadata.full_name, p_account_type: metadata.account_type,
        p_phone: metadata.phone, p_business_name: metadata.business_name
      });
      if (error) throw new Error('Your password was saved, but profile setup failed. Please retry completing signup.');
      form.elements.password.value = '';
      form.elements.confirm_password.value = '';
      window.location.assign(afterLoginUrl());
      return;
    }
    const { data, error } = await client.auth.signUp({
      email: values.email.trim(), password: values.password,
      options: { data: metadata, emailRedirectTo: url() }
    });
    if (error) throw error;
    form.elements.password.value = '';
    form.elements.confirm_password.value = '';
    if (data.user?.identities?.length === 0) {
      status('An account may already exist for this email. Try signing in instead.', 'error');
    } else if (data.session) {
      await sync(data.session);
      if (!state.user) throw new Error('Your profile is not ready yet. Please retry completing signup.');
      window.location.assign(afterLoginUrl());
    } else {
      status('Check your email to confirm your account, then sign in. If you already registered, use the Sign in link below.', 'success');
    }
  }
  async function init() {
    try {
      const notice = new URLSearchParams(window.location.search).get('notice');
      if (notice === 'signup-required') {
        status('No completed Hamperia account was found. Choose Create an account to sign up first.', 'error');
      } else if (notice === 'signin-failed') {
        status('Sign-in could not be completed. Try again, or choose Create an account if you have not signed up.', 'error');
      }
      if (!client) throw new Error('Sign-in is unavailable. Check your connection and reload this page.');
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const oauthError = hash.get('error_description');
      if (oauthError) {
        window.history.replaceState(null, '', window.location.pathname);
        sessionStorage.removeItem('hamperia_auth_intent');
        status(oauthError, 'error');
        return;
      }
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (data.session?.user) {
        const { error: verificationError } = await client.auth.getUser();
        if (verificationError) throw new Error('Your session could not be verified. Please sign in again.');
      }
      await sync(data.session, true);
      // Run outside the auth callback so profile queries cannot block Supabase's auth lock.
      client.auth.onAuthStateChange((_event, session) => {
        setTimeout(() => { if (!busy) void sync(session, Boolean(getIntent())).catch((error) => status(error.message, 'error')); }, 0);
      });
    } catch (error) {
      status(error.message, 'error');
    } finally {
      resolveReady(state);
    }
  }
  document.addEventListener('invalid', (event) => {
    const input = event.target;
    if (!input.form?.matches('[data-email-signin-form]')) return;
    event.preventDefault();
    // A missing email takes priority when both required fields are empty.
    const email = input.form.elements.email;
    if (!email.value.trim()) status('Please enter your email address.', 'error');
    else if (input.name === 'email') status('Please enter a valid email address.', 'error');
    else status('Please enter your password to sign in.', 'error');
  }, true);
  document.addEventListener('submit', (event) => {
    if (event.target.matches('[data-email-signin-form], [data-email-signup-form]')) {
      event.preventDefault();
      if (event.target.reportValidity()) void run(event.target.matches('[data-email-signin-form]') ? signIn : signUp, event.target);
    }
  });
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-google-signin]')) void run(() => google('signin'));
    if (event.target.closest('[data-google-signup]')) void run(() => google('signup'));
    if (event.target.closest('[data-auth-open]')) { event.preventDefault(); window.location.assign(url('auth/')); }
    if (event.target.closest('[data-signout]')) void run(async () => {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
      for (const listener of window.hamperia.beforeSignOutListeners) listener();
      for (const key of ['hamperia_cart_guest_v2', 'hamperia_wishlist_guest_v2', 'hamperia_cart_v1', 'hamperia_wishlist_v1', 'hamperia_builder_v1']) localStorage.removeItem(key);
      window.location.assign(url());
    });
  });
  signupForm?.elements.account_type.addEventListener('change', updateBusinessField);
  updateBusinessField();
  document.addEventListener('DOMContentLoaded', () => { void init(); });
}());
