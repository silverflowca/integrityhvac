# Authentication Integration Strategy
## Porting FreedomBus Auth System to IntegrityHVAC CRM

**Source:** `freedombus/freedom-bus-app`
**Target:** `integrityhvac`
**Estimated Tokens:** ~65,000
**Current Available:** ~101,000 ✅

---

## Overview

This document outlines the strategy to integrate the Supabase-based authentication system from FreedomBus into the IntegrityHVAC CRM application. The integration will add user login, session management, and protected routes to secure the CRM.

---

## Phase 1: Backend Setup (~15,000 tokens)

### 1.1 Database Schema
**Create users table in server:**

```sql
-- users table
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- sessions table
CREATE TABLE sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id),
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**File:** `integrityhvac/server/database/schema.sql`

### 1.2 Install Dependencies

```bash
cd integrityhvac/server
npm install bcryptjs jsonwebtoken cookie-parser
```

**Update:** `server/package.json`

### 1.3 Auth Middleware & Routes

**Files to create:**
- `server/middleware/auth.js` - JWT verification middleware
- `server/routes/auth.js` - Login, logout, register, refresh endpoints
- `server/controllers/authController.js` - Auth business logic

**Add to server.js:**
```javascript
import authRoutes from './routes/auth.js';
import { authenticateToken } from './middleware/auth.js';

app.use('/api/auth', authRoutes);
app.use('/api/leads', authenticateToken); // Protect leads routes
```

### 1.4 User Management

**Files to create:**
- `server/routes/users.js` - User CRUD operations
- `server/controllers/userController.js` - User management logic

---

## Phase 2: Frontend Auth Context (~20,000 tokens)

### 2.1 Create Auth Context

**File:** `client/src/contexts/AuthContext.jsx`

Based on FreedomBus `AuthContext.tsx`, but simplified (no Supabase):

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing session on mount
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const response = await api.getCurrentUser();
                setUser(response.user);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const response = await api.login(email, password);
        localStorage.setItem('token', response.token);
        setUser(response.user);
        return response;
    };

    const logout = async () => {
        await api.logout();
        localStorage.removeItem('token');
        setUser(null);
    };

    const register = async (userData) => {
        const response = await api.register(userData);
        localStorage.setItem('token', response.token);
        setUser(response.user);
        return response;
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            logout,
            register,
            isAuthenticated: !!user
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
```

### 2.2 Update API Service

**File:** `client/src/services/api.js`

Add auth methods and token interceptor:

```javascript
class ApiService {
    getHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }

    // Auth endpoints
    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    async logout() {
        return this.request('/auth/logout', { method: 'POST' });
    }

    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async getCurrentUser() {
        return this.request('/auth/me');
    }
}
```

---

## Phase 3: Login/Signup UI (~15,000 tokens)

### 3.1 Create Login Screen

**File:** `client/src/components/auth/Login.jsx`

```javascript
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSignup, setIsSignup] = useState(false);
    const { login, register } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            if (isSignup) {
                await register({ email, password, name: email.split('@')[0] });
            } else {
                await login(email, password);
            }
        } catch (err) {
            setError(err.message || 'Authentication failed');
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>IntegrityHVAC CRM</h1>
                <h2>{isSignup ? 'Create Account' : 'Sign In'}</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="btn-submit">
                        {isSignup ? 'Sign Up' : 'Sign In'}
                    </button>
                </form>

                <button
                    className="btn-toggle"
                    onClick={() => setIsSignup(!isSignup)}
                >
                    {isSignup
                        ? 'Already have an account? Sign In'
                        : 'Need an account? Sign Up'}
                </button>
            </div>
        </div>
    );
};

export default Login;
```

**File:** `client/src/components/auth/Login.css`

Beautiful gradient-based login screen styling.

---

## Phase 4: Protected Routes (~10,000 tokens)

### 4.1 Create ProtectedRoute Component

**File:** `client/src/components/auth/ProtectedRoute.jsx`

```javascript
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
```

### 4.2 Update App.jsx with Routes

**File:** `client/src/App.jsx`

```javascript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import CRM from './components/CRM'; // Existing CRM app

function AppRoutes() {
    const { isAuthenticated } = useAuth();

    return (
        <Routes>
            <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/" /> : <Login />}
            />
            <Route
                path="/*"
                element={
                    <ProtectedRoute>
                        <CRM />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}
```

### 4.3 Extract Current App to CRM Component

Move existing App.jsx content to `client/src/components/CRM.jsx`

---

## Phase 5: User Management Features (~5,000 tokens)

### 5.1 Add User Profile

**File:** `client/src/components/profile/UserProfile.jsx`

- Display current user info
- Change password
- Update profile

### 5.2 Add Logout to Topbar

**Update:** `client/src/components/layout/Topbar.jsx`

```javascript
import { useAuth } from '../../contexts/AuthContext';

const Topbar = ({ ... }) => {
    const { user, logout } = useAuth();

    return (
        <div className="topbar">
            {/* existing topbar content */}
            <div className="user-menu">
                <span>{user?.email}</span>
                <button onClick={logout}>Logout</button>
            </div>
        </div>
    );
};
```

---

## Phase 6: Multi-User Support (Optional, +10,000 tokens)

### 6.1 Add User Assignment to Leads

**Update database schema:**
```sql
ALTER TABLE leads ADD COLUMN assigned_to VARCHAR(255) REFERENCES users(id);
```

### 6.2 Filter Leads by User

Add role-based access control:
- Admin: See all leads
- User: See only assigned leads

---

## Implementation Checklist

### Backend
- [ ] Create database schema (users, sessions)
- [ ] Install dependencies (bcryptjs, jsonwebtoken, cookie-parser)
- [ ] Create auth middleware (`middleware/auth.js`)
- [ ] Create auth routes (`routes/auth.js`)
- [ ] Create auth controller (`controllers/authController.js`)
- [ ] Protect existing API routes with auth middleware
- [ ] Add user management routes

### Frontend
- [ ] Install dependencies (react-router-dom)
- [ ] Create AuthContext (`contexts/AuthContext.jsx`)
- [ ] Update API service with auth methods
- [ ] Create Login component (`components/auth/Login.jsx`)
- [ ] Create Login styles (`components/auth/Login.css`)
- [ ] Create ProtectedRoute component
- [ ] Update App.jsx with routing
- [ ] Extract current app to CRM component
- [ ] Add logout to Topbar
- [ ] Add user profile management

### Docker
- [ ] Update Dockerfile to handle new dependencies
- [ ] Add environment variables for JWT_SECRET
- [ ] Update docker-compose.yml

### Testing
- [ ] Test user registration
- [ ] Test user login
- [ ] Test session persistence
- [ ] Test protected routes
- [ ] Test logout
- [ ] Test token expiration

---

## Environment Variables

**Server (.env):**
```bash
PORT=8677
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
```

---

## Alternative: Use Supabase (like FreedomBus)

If you want to use Supabase instead of custom JWT:

### Pros:
- Free tier (up to 50,000 monthly active users)
- Built-in authentication
- Real-time database
- Row-level security
- OAuth providers (Google, GitHub, etc.)

### Cons:
- External dependency
- Requires internet connection
- Supabase project setup

### Setup:
1. Create Supabase project at https://supabase.com
2. Install `@supabase/supabase-js`
3. Copy FreedomBus auth implementation directly
4. Update environment variables with Supabase keys

---

## Files to Reference from FreedomBus

**Auth Context:**
- `freedombus/freedom-bus-app/contexts/AuthContext.tsx`

**Supabase Service:**
- `freedombus/freedom-bus-app/lib/supabaseService.ts`

**Mock Users (for testing):**
- `freedombus/freedom-bus-app/data/mockUsers.ts`

**User Types:**
- `freedombus/freedom-bus-app/constants/roles.ts`

---

## Token Estimate Breakdown

| Phase | Description | Est. Tokens |
|-------|-------------|-------------|
| 1 | Backend Setup | 15,000 |
| 2 | Auth Context | 20,000 |
| 3 | Login/Signup UI | 15,000 |
| 4 | Protected Routes | 10,000 |
| 5 | User Management | 5,000 |
| **Total** | | **~65,000** |

**Current Available:** ~101,000 tokens ✅

---

## Next Steps

1. Review this strategy
2. Decide: Custom JWT vs Supabase
3. Set up database schema
4. Implement backend auth
5. Create frontend auth context
6. Build login UI
7. Test authentication flow
8. Deploy to Docker

---

## Notes

- This integration makes the CRM multi-user capable
- Each user will have their own login
- Sessions persist across page reloads
- JWT tokens expire after 7 days (configurable)
- All API routes will be protected by default
- Can add role-based permissions later (admin, user, etc.)

---

**Created:** 2026-01-07
**For:** IntegrityHVAC CRM
**From:** FreedomBus Auth System
