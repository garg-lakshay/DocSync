import { LandingBackdrop } from "@/components/landing-content";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      <LandingBackdrop />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col justify-center px-6 py-16">
        <div className="rounded-[10px] border border-border bg-surface-2 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <h1 className="mb-6 text-center text-2xl font-semibold text-text-primary">
            Create account
          </h1>
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
