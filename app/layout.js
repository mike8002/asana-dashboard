import './globals.css';
import AuthProvider from '../components/AuthProvider';

export const metadata = {
  title: 'Team Utilisation — Project Hub V3',
  description: 'UM MENAT team dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
