import AuthForm from "@/components/auth/AuthForm";

export default function AuthPage() {
  return (
    <main className="min-h-screen bg-[#e9e3d5] px-4 py-12">
      <div className="relative z-10 pointer-events-auto">
        <AuthForm />
      </div>
    </main>
  );
}
