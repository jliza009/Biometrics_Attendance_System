import { ThemeProvider } from './hooks/useTheme';
import { SystemProvider } from './hooks/useSystem';
import Layout from './components/Layout';

export default function App() {
  return (
    <ThemeProvider>
      <SystemProvider>
        <Layout />
      </SystemProvider>
    </ThemeProvider>
  );
}

