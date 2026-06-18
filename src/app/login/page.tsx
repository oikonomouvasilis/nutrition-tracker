import AuthBackground from "./auth-background";
import AuthForm from "./auth-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const sp = await searchParams;

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden p-6" style={{ background: "var(--color-bg)" }}>
      <AuthBackground />

      <div className="relative z-10 w-full max-w-sm">
        <div className="card p-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            Nutri<span className="text-neon-green">Dash</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            Σύνδεση ή εγγραφή για να συνεχίσεις.
          </p>

          <AuthForm error={sp.error} message={sp.message} />
        </div>
      </div>
    </main>
  );
}
