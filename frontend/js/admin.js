// OmniAI Admin Panel - Complete Rewrite
// Uses apiRequest from api.js for consistency

(function() {
    'use strict';

    let currentSection = 'users';
    let isInitialized = false;

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    function $(id) {
        return document.getElementById(id);
    }

    function showAdminError(message) {
        if (window.showError) {
            window.showError(message);
        } else {
            console.error(message);
        }
    }

    function showAdminSuccess(message) {
        if (window.showSuccess) {
            window.showSuccess(message);
        } else if (window.showToast) {
            window.showToast(message, 'success');
        } else {
            console.log(message);
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(dateStr) {
        if (!dateStr) return 'Never';
        return new Date(dateStr).toLocaleString();
    }

    // ============================================
    // API CALLS (using apiRequest from api.js)
    // ============================================

    async function adminFetch(endpoint, options = {}) {
        const baseUrl = getApiBaseUrl();
        const url = `${baseUrl}${endpoint}`;

        const headers = {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            ...options.headers,
        };

        const csrfToken = localStorage.getItem('csrfToken');
        if (csrfToken && ['POST', 'PATCH', 'PUT', 'DELETE'].includes((options.method || 'GET').toUpperCase())) {
            headers['X-CSRF-Token'] = csrfToken;
        }

        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include',
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        return response.json();
    }

    // ============================================
    // DATA LOADING
    // ============================================

    async function loadUsers() {
        try {
            const data = await adminFetch('/admin/users');
            renderUsers(data.users || []);
        } catch (error) {
            showAdminError('Failed to load users: ' + error.message);
        }
    }

    async function loadInvites() {
        try {
            const data = await adminFetch('/admin/invites');
            renderInvites(data.invites || []);
        } catch (error) {
            showAdminError('Failed to load invites: ' + error.message);
        }
    }

    async function loadAuditLog(q = '', action = '', since = '') {
        try {
            const params = new URLSearchParams();
            if (q) params.append('q', q);
            if (action) params.append('action', action);
            if (since) params.append('since', since);

            const data = await adminFetch(`/admin/audit?${params}`);
            renderAuditLog(data.entries || []);
        } catch (error) {
            showAdminError('Failed to load audit log: ' + error.message);
        }
    }

    async function loadQuotas() {
        try {
            const usersData = await adminFetch('/admin/users');
            const quotas = [];

            for (const user of (usersData.users || [])) {
                try {
                    const quotaData = await adminFetch(`/admin/quotas/${user.id}`);
                    quotas.push({ ...quotaData, username: user.username });
                } catch (e) {
                    quotas.push({
                        user_id: user.id,
                        username: user.username,
                        messages_per_day: 100,
                        tokens_per_day: 10000,
                        updated_at: null
                    });
                }
            }
            renderQuotas(quotas);
        } catch (error) {
            showAdminError('Failed to load quotas: ' + error.message);
        }
    }

    // ============================================
    // RENDERING
    // ============================================

    function renderUsers(users) {
        const tbody = $('users-tbody');
        if (!tbody) return;

        tbody.innerHTML = users.map(user => `
            <tr data-user-id="${user.id}">
                <td>${user.id}</td>
                <td>${escapeHtml(user.username)}</td>
                <td>${escapeHtml(user.display_name || '')}</td>
                <td>
                    <select class="user-role-select" data-user-id="${user.id}">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td>
                    <select class="user-status-select" data-user-id="${user.id}">
                        <option value="active" ${user.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="disabled" ${user.status === 'disabled' ? 'selected' : ''}>Disabled</option>
                    </select>
                </td>
                <td>${formatDate(user.created_at)}</td>
                <td>${formatDate(user.last_login)}</td>
                <td>-</td>
            </tr>
        `).join('');
    }

    function renderInvites(invites) {
        const tbody = $('invites-tbody');
        if (!tbody) return;

        tbody.innerHTML = invites.map(invite => `
            <tr>
                <td><code>${escapeHtml(invite.code)}</code></td>
                <td>${invite.created_by || '-'}</td>
                <td>${invite.used_by || 'Not used'}</td>
                <td>${formatDate(invite.expires_at)}</td>
                <td>${invite.revoked_at ? 'Yes' : 'No'}</td>
                <td>${formatDate(invite.created_at)}</td>
                <td>
                    ${!invite.revoked_at && !invite.used_by ?
                        `<button class="btn-ghost btn-danger revoke-invite-btn" data-code="${escapeHtml(invite.code)}">Revoke</button>` :
                        '-'}
                </td>
            </tr>
        `).join('');
    }

    function renderAuditLog(entries) {
        const tbody = $('audit-tbody');
        if (!tbody) return;

        tbody.innerHTML = entries.map(entry => `
            <tr>
                <td>${entry.id}</td>
                <td>${escapeHtml(entry.action)}</td>
                <td>${escapeHtml(entry.target || '-')}</td>
                <td>${entry.actor_user_id || '-'}</td>
                <td>${escapeHtml(entry.ip || '-')}</td>
                <td>${formatDate(entry.created_at)}</td>
            </tr>
        `).join('');
    }

    function renderQuotas(quotas) {
        const tbody = $('quotas-tbody');
        if (!tbody) return;

        tbody.innerHTML = quotas.map(quota => `
            <tr data-user-id="${quota.user_id}">
                <td>${quota.user_id}</td>
                <td>${escapeHtml(quota.username)}</td>
                <td><input type="number" class="quota-messages" value="${quota.messages_per_day}" min="1" max="10000"></td>
                <td><input type="number" class="quota-tokens" value="${quota.tokens_per_day}" min="1" max="1000000"></td>
                <td>${quota.updated_at ? formatDate(quota.updated_at) : 'Default'}</td>
                <td><button class="btn-secondary save-quota-btn">Save</button></td>
            </tr>
        `).join('');
    }

    // ============================================
    // ACTIONS
    // ============================================

    async function updateUserRole(userId, role) {
        try {
            await adminFetch(`/admin/users/${userId}`, {
                method: 'PATCH',
                body: JSON.stringify({ role })
            });
            showAdminSuccess('User role updated');
        } catch (error) {
            showAdminError('Failed to update role: ' + error.message);
            await loadUsers(); // Refresh to reset select
        }
    }

    async function updateUserStatus(userId, status) {
        try {
            await adminFetch(`/admin/users/${userId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });
            showAdminSuccess('User status updated');
        } catch (error) {
            showAdminError('Failed to update status: ' + error.message);
            await loadUsers();
        }
    }

    async function createInvite() {
        const hours = prompt('Expiration time in hours:', '24');
        if (!hours) return;

        try {
            const data = await adminFetch('/admin/invites', {
                method: 'POST',
                body: JSON.stringify({ expires_in_hours: parseInt(hours) || 24 })
            });
            showAdminSuccess('Invite created: ' + data.invite_code);
            await loadInvites();
        } catch (error) {
            showAdminError('Failed to create invite: ' + error.message);
        }
    }

    async function revokeInvite(code) {
        if (!confirm(`Revoke invite "${code}"?`)) return;

        try {
            await adminFetch(`/admin/invites/${code}/revoke`, { method: 'POST' });
            showAdminSuccess('Invite revoked');
            await loadInvites();
        } catch (error) {
            showAdminError('Failed to revoke invite: ' + error.message);
        }
    }

    async function saveQuota(userId, messages, tokens) {
        try {
            await adminFetch(`/admin/quotas/${userId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    messages_per_day: parseInt(messages) || 100,
                    tokens_per_day: parseInt(tokens) || 10000
                })
            });
            showAdminSuccess('Quota saved');
        } catch (error) {
            showAdminError('Failed to save quota: ' + error.message);
        }
    }

    // ============================================
    // SECTION SWITCHING
    // ============================================

    function switchSection(section) {
        currentSection = section;

        // Update tabs
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.toggle('active', tab.id === `admin-${section}-tab`);
        });

        // Update sections
        document.querySelectorAll('.admin-section').forEach(sec => {
            sec.classList.toggle('hidden', sec.id !== `admin-${section}-section`);
        });

        // Load data
        switch (section) {
            case 'users': loadUsers(); break;
            case 'invites': loadInvites(); break;
            case 'audit': loadAuditLog(); break;
            case 'quotas': loadQuotas(); break;
        }
    }

    // ============================================
    // EVENT HANDLING (Event Delegation)
    // ============================================

    function handleAdminClick(e) {
        const target = e.target;

        // Tab switching
        if (target.classList.contains('admin-tab')) {
            const section = target.id.replace('admin-', '').replace('-tab', '');
            switchSection(section);
            return;
        }

        // Create invite
        if (target.id === 'create-invite-btn') {
            createInvite();
            return;
        }

        // Revoke invite
        if (target.classList.contains('revoke-invite-btn')) {
            const code = target.dataset.code;
            if (code) revokeInvite(code);
            return;
        }

        // Save quota
        if (target.classList.contains('save-quota-btn')) {
            const row = target.closest('tr');
            if (row) {
                const userId = row.dataset.userId;
                const messages = row.querySelector('.quota-messages')?.value;
                const tokens = row.querySelector('.quota-tokens')?.value;
                if (userId) saveQuota(userId, messages, tokens);
            }
            return;
        }

        // Audit search
        if (target.id === 'audit-search-btn') {
            const q = $('audit-q')?.value || '';
            const action = $('audit-action')?.value || '';
            const since = $('audit-since')?.value || '';
            loadAuditLog(q, action, since);
            return;
        }

        // Logout
        if (target.id === 'admin-logout-btn') {
            if (window.handleLogout) {
                window.handleLogout().then(() => {
                    if (window.setRoute) window.setRoute('login');
                });
            }
            return;
        }
    }

    function handleAdminChange(e) {
        const target = e.target;

        // User role change
        if (target.classList.contains('user-role-select')) {
            const userId = target.dataset.userId;
            if (userId) updateUserRole(userId, target.value);
            return;
        }

        // User status change
        if (target.classList.contains('user-status-select')) {
            const userId = target.dataset.userId;
            if (userId) updateUserStatus(userId, target.value);
            return;
        }
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function initializeAdmin() {
        if (isInitialized) {
            // Just reload current section data
            switchSection(currentSection);
            return;
        }

        const adminView = $('admin-view');
        if (!adminView) return;

        // Update user display
        const userDisplay = $('admin-user-display');
        const user = window.getCurrentUser ? window.getCurrentUser() : null;
        if (userDisplay && user) {
            userDisplay.textContent = user.username || 'Admin';
        }

        // Event delegation - single listener for all clicks
        adminView.addEventListener('click', handleAdminClick);
        adminView.addEventListener('change', handleAdminChange);

        isInitialized = true;

        // Load initial data
        switchSection(currentSection);
    }

    // ============================================
    // EXPOSE GLOBALLY
    // ============================================

    window.initializeAdmin = initializeAdmin;

})();
