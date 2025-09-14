import React from 'react';

interface LoaderProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  overlay?: boolean;
  color?: string;
}

const Loader: React.FC<LoaderProps> = ({ 
  message = 'Loading...', 
  size = 'medium',
  overlay = true,
  color = '#ff3b30'
}) => {
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 56
  };

  const spinnerSize = sizeMap[size];

  const spinnerStyle: React.CSSProperties = {
    width: `${spinnerSize}px`,
    height: `${spinnerSize}px`,
    border: `3px solid #f3f3f3`,
    borderTop: `3px solid ${color}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: message ? '16px' : '0'
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(2px)'
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px'
  };

  const messageStyle: React.CSSProperties = {
    fontSize: size === 'small' ? '14px' : size === 'large' ? '18px' : '16px',
    color: '#333',
    fontWeight: 500,
    textAlign: 'center',
    marginTop: '8px',
    maxWidth: '300px'
  };

  const keyframesStyle = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;

  React.useEffect(() => {
    // Inject keyframes if not already present
    if (!document.querySelector('#loader-keyframes')) {
      const style = document.createElement('style');
      style.id = 'loader-keyframes';
      style.textContent = keyframesStyle;
      document.head.appendChild(style);
    }

    // Prevent body scroll when overlay is active
    if (overlay) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [overlay]);

  const content = (
    <div style={containerStyle}>
      <div style={spinnerStyle} role="status" aria-label="Loading"></div>
      {message && (
        <div style={messageStyle} aria-live="polite">
          {message}
        </div>
      )}
    </div>
  );

  if (overlay) {
    return <div style={overlayStyle}>{content}</div>;
  }

  return content;
};

export default Loader;