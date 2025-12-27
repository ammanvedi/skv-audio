import "@/styles/globals.css";
import type { AppProps } from "next/app";
import PasswordGate from "@/components/PasswordGate";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <PasswordGate>
      <Component {...pageProps} />
    </PasswordGate>
  );
}
