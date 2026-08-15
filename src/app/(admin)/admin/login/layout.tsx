import "../../../globals.css";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="flex min-h-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        {children}
      </body>
    </html>
  );
}
