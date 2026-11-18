import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './fonts.css';
import './styles.css';

/**
 * Safety net: previously a single render error (e.g. an icon that was used but
 * never imported) unmounted the whole React tree and left the player staring at
 * the empty sky-blue <body> background. The boundary keeps the game usable and
 * offers a recovery path instead of a "blue screen".
 */
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[Monopoli Konoha] render error:', error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  handleResetLocal = () => {
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith('monopoli_konoha_'))
        .forEach((key) => localStorage.removeItem(key));
    } catch {
      // ignore storage restrictions
    }
    window.location.replace(window.location.pathname);
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'linear-gradient(180deg, #cda87d 0%, #b98f60 100%)',
          fontFamily: "'Baloo 2', system-ui, sans-serif",
          color: '#2a1d14',
        }}
      >
        <div
          style={{
            maxWidth: 460,
            width: '100%',
            background: '#f4ebd9',
            border: '3px solid #2a1d14',
            borderRadius: 16,
            padding: '22px 22px 18px',
            boxShadow: '0 14px 34px rgba(25, 16, 8, 0.4)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 0.5 }}>
            ADA KENDALA TAMPILAN
          </div>
          <p style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.5, opacity: 0.85 }}>
            Permainan berhenti sebentar karena ada kesalahan render. Coba muat ulang halaman;
            jika masih terjadi, reset pengaturan lokal perangkat ini.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              type="button"
              onClick={this.handleRetry}
              style={{
                flex: 1,
                padding: '11px 12px',
                borderRadius: 11,
                border: '2px solid #2a1d14',
                background: '#74cf40',
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 13,
              }}
            >
              COBA LAGI
            </button>
            <button
              type="button"
              onClick={this.handleResetLocal}
              style={{
                flex: 1,
                padding: '11px 12px',
                borderRadius: 11,
                border: '2px solid #2a1d14',
                background: '#e6c79b',
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 13,
              }}
            >
              RESET PENGATURAN
            </button>
          </div>
        </div>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
