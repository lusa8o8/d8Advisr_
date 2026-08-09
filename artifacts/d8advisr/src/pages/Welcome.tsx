import { useLocation } from "wouter";
import { LegalLinks } from "@workspace/d8-core/legal";
import { AuthLayout } from "@workspace/d8-core/ui/auth-layout";

export function Welcome() {
  const [, setLocation] = useLocation();

  return (
    <AuthLayout showLogo={true}>
      <h1 className="text-[1.35rem] text-muted-foreground text-center font-medium leading-[1.6] px-2 mb-4 lg:mb-12 mt-6">
        Plan unforgettable dates & group experiences <span className="text-primary">— effortlessly.</span>
      </h1>
      <p className="text-sm text-muted-foreground text-center px-4 mb-12 lg:hidden">
        D8Advisr is a social planning platform that helps you discover curated venues and events, build itineraries, and manage budgets for group outings.
      </p>
      
      <div className="w-full flex flex-col gap-4 mb-6 shrink-0">
        <button 
          onClick={() => setLocation('/signup')}
          className="w-full bg-primary text-primary-foreground py-[18px] rounded-xl font-semibold text-lg shadow-[0_8px_20px_-6px_rgba(255,90,95,0.6)] active:scale-[0.98] transition-all hover:bg-primary/90"
        >
          Get Started
        </button>
        <button 
          onClick={() => setLocation('/signin')}
          className="w-full bg-white text-foreground border-2 border-border py-[18px] rounded-xl font-semibold text-lg active:scale-[0.98] transition-all hover:bg-gray-50"
        >
          Sign In
        </button>
      </div>
      <LegalLinks className="relative z-10 pb-4 shrink-0" />
    </AuthLayout>
  );
}
