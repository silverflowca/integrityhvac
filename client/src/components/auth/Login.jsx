import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSignup, setIsSignup] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login, register, resetPassword } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (isForgotPassword) {
                await resetPassword(email);
                setSuccess('Password reset email sent! Check your inbox.');
                setTimeout(() => {
                    setIsForgotPassword(false);
                    setSuccess('');
                }, 3000);
            } else if (isSignup) {
                await register({ email, password, name });
                setSuccess('Account created! You may need to verify your email.');
            } else {
                await login(email, password);
            }
        } catch (err) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsSignup(!isSignup);
        setIsForgotPassword(false);
        setError('');
        setSuccess('');
        setName('');
    };

    const toggleForgotPassword = () => {
        setIsForgotPassword(!isForgotPassword);
        setIsSignup(false);
        setError('');
        setSuccess('');
        setPassword('');
        setName('');
    };

    return (
        <div className="login-container">
            <div className="login-background">
                <div className="login-circle circle-1"></div>
                <div className="login-circle circle-2"></div>
                <div className="login-circle circle-3"></div>
            </div>

            <div className="login-card">
                <div className="login-header">
                    <h1>IntegrityHVAC</h1>
                    <p>Cold Calling CRM System</p>
                </div>

                <h2>
                    {isForgotPassword
                        ? 'Reset Password'
                        : (isSignup ? 'Create Account' : 'Welcome Back')}
                </h2>

                <form onSubmit={handleSubmit} className="login-form">
                    {isSignup && !isForgotPassword && (
                        <div className="form-group">
                            <label>Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your name"
                                required={isSignup}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your.email@example.com"
                            required
                        />
                    </div>

                    {!isForgotPassword && (
                        <div className="form-group">
                            <label>Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                            />
                        </div>
                    )}

                    {error && (
                        <div className="error-message">
                            ⚠️ {error}
                        </div>
                    )}

                    {success && (
                        <div className="success-message">
                            ✅ {success}
                        </div>
                    )}

                    <button type="submit" className="btn-submit" disabled={loading}>
                        {loading ? 'Please wait...' : (
                            isForgotPassword ? 'Send Reset Link' :
                            (isSignup ? 'Create Account' : 'Sign In')
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    {!isForgotPassword && (
                        <>
                            <button className="btn-toggle" onClick={toggleMode}>
                                {isSignup
                                    ? 'Already have an account? Sign In'
                                    : 'Need an account? Sign Up'}
                            </button>

                            {!isSignup && (
                                <button className="btn-link" onClick={toggleForgotPassword}>
                                    Forgot Password?
                                </button>
                            )}
                        </>
                    )}

                    {isForgotPassword && (
                        <button className="btn-toggle" onClick={toggleForgotPassword}>
                            ← Back to Sign In
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
