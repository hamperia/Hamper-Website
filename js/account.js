(function () {
  if (!window.hamperia) return;
  window.hamperia.onSession = async (state) => {
    const gate = document.querySelector('[data-account-gate]');
    const content = document.querySelector('[data-account-content]');
    if (!gate || !content) return;
    gate.hidden = Boolean(state.user); content.hidden = !state.user;
    if (state.user) {
      document.querySelector('[data-account-name]').textContent = state.profile?.display_name || 'friend';
      document.querySelector('[data-account-email]').textContent = state.user.email || '';
      document.querySelector('[data-account-role]').textContent = state.role === 'consumer'
        ? state.profile?.requested_role === 'producer' ? 'Product host — awaiting admin approval' : 'Customer'
        : state.role === 'producer' ? 'Product host' : 'Admin';
    }
  };
}());
