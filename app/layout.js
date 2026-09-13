import './globals.css';
import { Cormorant_Garamond, Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

export const metadata = {
  title: 'Jornada Bíblica',
  description: 'Plataforma de estudo bíblico guiado',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1F4E5F',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${cormorant.variable}`}>{children}</body>
    </html>
  );
}
