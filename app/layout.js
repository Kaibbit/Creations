import './globals.css';

export const metadata = {
  title: 'Jornada Bíblica',
  description: 'Plataforma de estudo bíblico guiado',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#173d32',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
