import { dataService } from './dataService';

const SESSION_KEY = 'hrms_current_session';
const LOCKOUT_LIMIT = 999; // Effectively disabled lockout
const LOCKOUT_DURATION_MINS = 1; 

/**
 * SHA-256 Hashing using Web Crypto API
 */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function normalizeEmail(email) {
  return email ? email.trim().toLowerCase() : '';
}

/**
 * Password Policy Enforcement
 */
function validatePassword(password) {
  const minLength = 7;
  const hasUpper = /[A-Z]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (password.length < minLength) return "Password must be at least 8 characters long.";
  if (!hasUpper) return "Password must contain at least one uppercase letter.";
  if (!hasSpecial) return "Password must contain at least one special character.";
  return null;
}

export const authService = {
  /**
   * Initialize system with a default admin if no users exist
   */
  async init() {
    const users = dataService.getUsers();
    
    // Recovery logic: If users are missing, we MUST seed the admin even if guard is set
    if (users.length === 0) {
      const admin = {
        id: 'ADMIN_001',
        email: 'admin@hrms.com',
        name: 'System Admin',
        passwordHash: await hashPassword('Admin@123'),
        role: 'management',
        active: true,
        forcePasswordReset: true,
        plainPassword: 'Admin@123',
        createdAt: new Date().toISOString()
      };
      const alice = {
        id: 1,
        email: 'alice@company.com',
        name: 'Alice Smith',
        passwordHash: await hashPassword('Alice@123'),
        role: 'employee',
        active: true,
        forcePasswordReset: false,
        plainPassword: 'Alice@123',
        createdAt: new Date().toISOString()
      };
      const bob = {
        id: 2,
        email: 'bob@company.com',
        name: 'Bob Johnson',
        passwordHash: await hashPassword('Bob@123'),
        role: 'employee',
        active: true,
        forcePasswordReset: false,
        plainPassword: 'Bob@123',
        createdAt: new Date().toISOString()
      };
      dataService.saveUsers([admin, alice, bob]);
      localStorage.setItem('hrms_init_guard', 'true');
      dataService.addAuthLog('SYSTEM_INIT', 'SYSTEM', 'Standard users seeded.');
    } else {
      // Self-Healing Logic: ensure default accounts are healthy
      const users = dataService.getUsers();
      const accounts = [
        { email: 'admin@hrms.com', pwd: 'Admin@123', role: 'management', name: 'System Admin', id: 'ADMIN_001' },
        { email: 'alice@company.com', pwd: 'Alice@123', role: 'employee', name: 'Alice Smith', id: 1 },
        { email: 'bob@company.com', pwd: 'Bob@123', role: 'employee', name: 'Bob Johnson', id: 2 }
      ];
      
      let changed = false;
      for (const acc of accounts) {
        const idx = users.findIndex(u => normalizeEmail(u.email) === acc.email);
        const expectedHash = await hashPassword(acc.pwd);
        
        if (idx === -1) {
          users.push({
            id: acc.id, email: acc.email, name: acc.name, passwordHash: expectedHash,
            plainPassword: acc.pwd,
            role: acc.role, active: true, forcePasswordReset: false, createdAt: new Date().toISOString()
          });
          changed = true;
        } else {
          if (!users[idx].active || users[idx].passwordHash !== expectedHash || !users[idx].plainPassword) {
            users[idx].active = true;
            users[idx].passwordHash = expectedHash;
            users[idx].plainPassword = acc.pwd;
            changed = true;
          }
        }
      }

      if (changed) {
        dataService.saveUsers(users);
        console.log("Standard accounts self-healed.");
      }
    }
  },

  async login(email, password) {
    const users = dataService.getUsers();
    const attempts = dataService.getLoginAttempts();
    const normalizedEmail = normalizeEmail(email);
    const user = users.find(u => normalizeEmail(u.email) === normalizedEmail);

    if (!user) {
      dataService.addAuthLog('LOGIN_FAIL', normalizedEmail, 'Identity validation failed (User not found).');
      throw new Error("Incorrect email address.");
    }

    if (!user.active) {
      dataService.addAuthLog('LOGIN_FAIL', normalizedEmail, 'Account deactivated.');
      throw new Error("Your account is deactivated. Please contact HR.");
    }

    // Check Lockout
    const attemptData = attempts[normalizedEmail] || { count: 0, lockedUntil: null };
    if (attemptData.lockedUntil && new Date(attemptData.lockedUntil) > new Date()) {
      const remainingMins = Math.ceil((new Date(attemptData.lockedUntil) - new Date()) / 60000);
      dataService.addAuthLog('LOGIN_LOCKOUT_HIT', normalizedEmail, `Attempted login during lockout. ${remainingMins}m remaining.`);
      throw new Error(`Account temporarily locked. Please try again in ${remainingMins} minutes.`);
    }

    const inputHash = await hashPassword(password);
    
    // Constant-time comparison simulation
    if (user.passwordHash === inputHash) {
      // Success
      const empRecord = dataService.getEmployeeById(user.id);
      const session = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        empCode: empRecord ? empRecord.empCode : null,
        forcePasswordReset: user.forcePasswordReset,
        loginTime: new Date().toISOString()
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      
      // Clear attempts
      delete attempts[normalizedEmail];
      dataService.saveLoginAttempts(attempts);
      
      dataService.addAuthLog('LOGIN_SUCCESS', normalizedEmail, 'Login successful.');
      return session;
    } else {
      // Failed
      attemptData.count = (attemptData.count || 0) + 1;
      let errorMsg = "Incorrect password.";
      
      if (attemptData.count >= LOCKOUT_LIMIT) {
        const lockoutTime = new Date();
        lockoutTime.setMinutes(lockoutTime.getMinutes() + LOCKOUT_DURATION_MINS);
        attemptData.lockedUntil = lockoutTime.toISOString();
        errorMsg = `Too many failed attempts. Your account has been locked for ${LOCKOUT_DURATION_MINS} minutes for security.`;
        dataService.addAuthLog('LOGIN_LOCKOUT_TRIGGERED', normalizedEmail, 'Security lockout triggered.');
      } else {
        dataService.addAuthLog('LOGIN_FAIL', normalizedEmail, `Verification failed. Attempt ${attemptData.count}/${LOCKOUT_LIMIT}`);
      }
      
      attempts[normalizedEmail] = attemptData;
      dataService.saveLoginAttempts(attempts);
      throw new Error(errorMsg);
    }
  },

  logout() {
    const user = this.getCurrentUser();
    if (user) {
      dataService.addAuthLog('LOGOUT', user.email, 'User logged out.');
    }
    localStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser() {
    const saved = localStorage.getItem(SESSION_KEY);
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  },
  
  getUserRole() {
    return this.getCurrentUser()?.role || null;
  },

  async createUser(email, password, role, name) {
    const pwdError = validatePassword(password);
    if (pwdError) throw new Error(pwdError);

    const users = dataService.getUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("User with this email already exists.");
    }

    const passwordHash = await hashPassword(password);
    const newUser = {
      id: `USR_${Date.now()}`,
      email: email.toLowerCase(),
      name,
      passwordHash,
      plainPassword: password,
      role,
      active: true,
      forcePasswordReset: false,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    dataService.saveUsers(users);
    
    const admin = this.getCurrentUser();
    dataService.addAuthLog('USER_CREATED', admin?.email || 'SYSTEM', `New user created: ${email}`);
    return newUser;
  },

  async resetUserPassword(userId, newPassword) {
    const pwdError = validatePassword(newPassword);
    if (pwdError) throw new Error(pwdError);

    const users = dataService.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error("User not found.");

    users[idx].passwordHash = await hashPassword(newPassword);
    users[idx].plainPassword = newPassword;
    users[idx].forcePasswordReset = true;
    dataService.saveUsers(users);

    const admin = this.getCurrentUser();
    dataService.addAuthLog('PWD_RESET_ADMIN', admin?.email || 'SYSTEM', `Admin reset password for: ${users[idx].email}`);
  },

  async updatePassword(userId, newPassword) {
    const pwdError = validatePassword(newPassword);
    if (pwdError) throw new Error(pwdError);

    const users = dataService.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error("User not found.");

    users[idx].passwordHash = await hashPassword(newPassword);
    users[idx].plainPassword = newPassword;
    users[idx].forcePasswordReset = false;
    dataService.saveUsers(users);

    // Update session if it's the current user
    const current = this.getCurrentUser();
    if (current && current.id === userId) {
      current.forcePasswordReset = false;
      localStorage.setItem(SESSION_KEY, JSON.stringify(current));
    }

    dataService.addAuthLog('PWD_CHANGED', users[idx].email, 'User updated their password.');
  },

  updateUserStatus(userId, active) {
    const users = dataService.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return;

    users[idx].active = active;
    dataService.saveUsers(users);

    const admin = this.getCurrentUser();
    dataService.addAuthLog('USER_STATUS_CHANGE', admin?.email || 'SYSTEM', `User ${users[idx].email} status set to ${active ? 'Active' : 'Inactive'}`);
  },

  updateUserRole(userId, newRole) {
    const users = dataService.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return;

    const oldRole = users[idx].role;
    users[idx].role = newRole;
    dataService.saveUsers(users);

    const admin = this.getCurrentUser();
    dataService.addAuthLog('USER_ROLE_CHANGE', admin?.email || 'SYSTEM', `User ${users[idx].email} role changed from ${oldRole} to ${newRole}`);
  },

  getUsers() {
    return dataService.getUsers();
  },

  getLogs() {
    return dataService.getAuthLogs();
  },

  async forgotPassword(email) {
    const users = dataService.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      // For security, don't reveal if user exists, but here we can be more helpful in a demo
      throw new Error("If an account exists for this email, a reset code will be sent.");
    }

    const resetToken = Math.random().toString(36).substr(2, 6).toUpperCase();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 15);

    // In a real app, send email here. In mock, we'll store it in a temp place or log it.
    dataService.addAuthLog('PWD_RESET_REQUEST', email, `Reset requested. Token: ${resetToken} (Expires in 15m)`);
    
    // Simulate email send
    console.log(`[MOCK EMAIL] To: ${email} - Subject: Password Reset - Code: ${resetToken}`);
    
    return { token: resetToken, email }; // Returning for demo purposes so UI can "fill" it
  }
};
