import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Sign up successful! Check your email to confirm.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/dashboard');
      }
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard',
      },
    });
    if (error) alert(error.message);
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #2563eb, #4f46e5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    } as React.CSSProperties,
    card: {
      background: 'white',
      borderRadius: '0.5rem',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      padding: '2rem',
      width: '100%',
      maxWidth: '28rem',
    } as React.CSSProperties,
    title: {
      fontSize: '1.875rem',
      fontWeight: 'bold',
      marginBottom: '0.5rem',
    } as React.CSSProperties,
    subtitle: {
      color: '#4b5563',
      marginBottom: '1.5rem',
    } as React.CSSProperties,
    form: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '1rem',
      marginBottom: '1.5rem',
    } as React.CSSProperties,
    input: {
      width: '100%',
      padding: '0.5rem 1rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: '1rem',
      boxSizing: 'border-box' as const,
    } as React.CSSProperties,
    button: {
      width: '100%',
      background: '#4f46e5',
      color: 'white',
      padding: '0.5rem',
      borderRadius: '0.375rem',
      fontWeight: '600',
      border: 'none',
      cursor: 'pointer',
      fontSize: '1rem',
    } as React.CSSProperties,
    buttonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    } as React.CSSProperties,
    googleButton: {
      width: '100%',
      border: '2px solid #d1d5db',
      padding: '0.5rem',
      borderRadius: '0.375rem',
      fontWeight: '600',
      background: 'white',
      cursor: 'pointer',
      marginBottom: '1.5rem',
    } as React.CSSProperties,
    toggleButton: {
      width: '100%',
      color: '#4f46e5',
      fontWeight: '600',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      textDecoration: 'underline',
    } as React.CSSProperties,
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Meeting Notes</h1>
        <p style={styles.subtitle}>Privacy-first meeting transcription</p>

        <form onSubmit={handleAuth} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {}),
            }}
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <button onClick={handleGoogleSignIn} style={styles.googleButton}>
          Sign in with Google
        </button>

        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          style={styles.toggleButton}
        >
          {isSignUp
            ? 'Already have an account? Sign in'
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
};