import './globals.css';

export const metadata = {
  title: 'AI-Powered Risk Intelligence Platform',
  description: 'Enterprise-grade real-time operational threat intelligence, XGBoost anomaly predictions, and SHAP explainable AI insights.',
  keywords: ['mlops', 'risk prediction', 'shap explanation', 'realtime monitoring', 'fastapi', 'xgboost'],
  authors: [{ name: 'Antigravity AI Engineer' }],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🛡️</text></svg>" />
      </head>
      <body className="antialiased min-h-screen text-slate-100 selection:bg-violet-600 selection:text-white">
        {/* Subtle background glow layers */}
        <div className="fixed inset-0 -z-50 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] glowing-dot-active" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[140px]" />
        </div>
        {children}
      </body>
    </html>
  );
}
