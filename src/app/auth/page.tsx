"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, type KeyboardEvent, type ClipboardEvent } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Globe2,
  Mail,
  Pencil,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { groupDigitsInThrees, isValidEmail, isValidFullName, isValidRwandaMobileDigits } from "@/lib/validation";

const RWANDA_PREFIX = "+250";

type ViewState = "login" | "signup" | "otp";

const discoverySources = [
  { value: "friend", label: "Friend / Referral" },
  { value: "social", label: "Social Media" },
  { value: "search", label: "Search Engine" },
  { value: "advertisement", label: "Advertisement" },
] as const;

const fieldClassName = "h-11 pl-11 text-sm";

const ValidatedField = ({
  icon: Icon,
  label,
  placeholder,
  type = "text",
  autoComplete,
  autoFocus,
  value,
  onChange,
  isValid,
  errorMessage,
}: {
  icon: LucideIcon;
  label: string;
  placeholder: string;
  type?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  value: string;
  onChange: (value: string) => void;
  isValid: (value: string) => boolean;
  errorMessage: string;
}) => {
  const [touched, setTouched] = useState(false);
  const valid = isValid(value);
  const showError = touched && value.length > 0 && !valid;

  return (
    <Field className="gap-1.5">
      <FieldLabel className="text-sm font-medium text-ink">{label}</FieldLabel>
      <div className="relative">
        <Icon
          aria-hidden="true"
          className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
          strokeWidth={1.5}
        />
        <Input
          className={`${fieldClassName} pr-10`}
          placeholder={placeholder}
          type={type}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          value={value}
          aria-invalid={showError}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => setTouched(true)}
        />
        {valid && (
          <CheckCircle2
            aria-hidden="true"
            className="absolute right-3.5 top-1/2 size-4.5 -translate-y-1/2 text-green-600"
            strokeWidth={2}
          />
        )}
      </div>
      {showError && <p className="text-xs font-medium text-red-600">{errorMessage}</p>}
    </Field>
  );
};

const EmailField = ({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) => (
  <ValidatedField
    icon={Mail}
    label={label}
    placeholder="you@example.com"
    type="email"
    autoComplete="email"
    autoFocus={autoFocus}
    value={value}
    onChange={onChange}
    isValid={isValidEmail}
    errorMessage="Enter a valid email address."
  />
);

const PhoneField = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (digits: string) => void;
}) => {
  const [touched, setTouched] = useState(false);
  const valid = isValidRwandaMobileDigits(value);
  const showError = touched && value.length > 0 && !valid;

  return (
    <Field className="gap-1.5">
      <FieldLabel className="text-sm font-medium text-ink">Phone Number</FieldLabel>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 items-center gap-2 text-sm text-ink"
        >
          {RWANDA_PREFIX}
          <span className="h-4 w-px bg-border" />
        </span>
        <Input
          className={`${fieldClassName} pl-18.5 pr-10`}
          placeholder="780 000 000"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={groupDigitsInThrees(value)}
          aria-invalid={showError}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 9))}
          onBlur={() => setTouched(true)}
        />
        {valid && (
          <CheckCircle2
            aria-hidden="true"
            className="absolute right-3.5 top-1/2 size-4.5 -translate-y-1/2 text-green-600"
            strokeWidth={2}
          />
        )}
      </div>
      {showError && (
        <p className="text-xs font-medium text-red-600">Enter a valid 9-digit phone number.</p>
      )}
    </Field>
  );
};

const OtpFields = ({
  code,
  onChange,
}: {
  code: string[];
  onChange: (code: string[]) => void;
}) => {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const updateCode = (index: number, value: string) => {
    const next = [...code];
    next[index] = value.replace(/\D/g, "").slice(-1);
    onChange(next);
    if (next[index] && index < 3) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted.padEnd(4, "").split(""));
    refs.current[Math.min(pasted.length, 4) - 1]?.focus();
  };

  return (
    <div className="flex gap-3" aria-label="4-digit verification code">
      {code.map((value, index) => (
        <Input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          aria-label={`Verification digit ${index + 1}`}
          className="size-14 rounded-xl border-x border-y bg-transparent text-center text-xl text-ink focus-visible:ring-2 focus-visible:ring-primary"
          inputMode="numeric"
          maxLength={1}
          onChange={(event) => updateCode(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          value={value}
        />
      ))}
    </div>
  );
}

const AuthPage = () => {
  const [view, setView] = useState<ViewState>("login");
  const [discoverySource, setDiscoverySource] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [otpCode, setOtpCode] = useState(["", "", "", ""]);
  const [otpSourceView, setOtpSourceView] = useState<"login" | "signup">("login");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const verifiedEmail = otpSourceView === "signup" ? signupEmail : loginEmail;
  const loginEmailValid = isValidEmail(loginEmail);
  const signupValid =
    isValidFullName(signupName) &&
    isValidEmail(signupEmail) &&
    isValidRwandaMobileDigits(signupPhone) &&
    discoverySource !== "";
  const otpComplete = otpCode.every((digit) => digit !== "");

  const switchView = (next: ViewState) => {
    setView(next);
    setOtpCode(["", "", "", ""]);
  };

  const handleSubmit = () => {
    if (view === "login") {
      if (!loginEmailValid) {
        toast.error("Enter a valid email address", {
          description: "We couldn't recognize that email format.",
        });
        return;
      }
      setSubmitting(true);
      window.setTimeout(() => {
        setSubmitting(false);
        toast.success("Verification code sent", {
          description: `We sent a 4-digit code to ${loginEmail.trim()}.`,
        });
        setOtpSourceView("login");
        setView("otp");
      }, 500);
      return;
    }

    if (view === "signup") {
      if (!signupValid) {
        toast.error("Check the highlighted fields", {
          description: "Full name, email, phone number and referral source are all required.",
        });
        return;
      }
      setSubmitting(true);
      window.setTimeout(() => {
        setSubmitting(false);
        toast.success("Verification code sent", {
          description: `We sent a 4-digit code to ${signupEmail.trim()}.`,
        });
        setOtpSourceView("signup");
        setView("otp");
      }, 500);
      return;
    }

    if (!otpComplete) {
      toast.error("Enter the full 4-digit code", {
        description: "All 4 digits are required to verify your email.",
      });
      return;
    }

    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      toast.success("Login successful", {
        description: "Welcome back to Magnificat Smart Space.",
      });
      router.push("/");
    }, 500);
  };

  const resendOtp = () => {
    setOtpCode(["", "", "", ""]);
    toast.info("Verification code resent", {
      description: `We sent a new code to ${verifiedEmail.trim()}.`,
    });
  };

  const submitDisabled =
    submitting ||
    (view === "login" && !loginEmailValid) ||
    (view === "signup" && !signupValid) ||
    (view === "otp" && !otpComplete);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted-background p-4 font-sans text-ink sm:p-8">
      <section className="flex h-[calc(100vh-2rem)] min-h-150 w-full max-w-5xl flex-col overflow-hidden rounded-2xl  bg-white shadow-[0_0_40px_rgba(15,39,71,0.05)] md:h-200 md:max-h-[90vh] md:flex-row">
        <div className="scrollbar-hide flex w-full flex-col overflow-y-auto md:w-1/2">
          <div className="flex min-h-full flex-col p-8 md:p-12 lg:p-16">
            <div className="mb-4 flex w-full justify-center">
              <Image
                src="/images/logo.png"
                alt="Magnificat Smart Space Logo"
                width={140}
                height={140}
                className="object-contain"
                priority
              />
            </div>

            <div className="mb-8 mt-auto">
              <h1 className="mb-2 text-2xl font-bold tracking-tight text-ink md:text-3xl">
                {view === "login" && "Welcome Back"}
                {view === "signup" && "Create your account"}
                {view === "otp" && "Email Verification"}
              </h1>
              <p className="h-10 text-sm leading-5 text-muted">
                {view === "login" && <>You can log in with just your email —<br />we&apos;ll send a one-time code to it.</>}
                {view === "signup" && <>Setting up an account takes less<br />than 1 minute.</>}
                {view === "otp" && <>Please enter the 4-digit code sent to<br />your email.</>}
              </p>
            </div>

            {view !== "otp" && (
              <div className="mb-8 flex w-fit shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => switchView("login")}
                  className={`h-10 rounded-full px-6 text-sm ${view === "login" ? "bg-primary text-ink shadow-sm hover:bg-primary" : "text-muted hover:text-ink"}`}
                >
                  Login
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => switchView("signup")}
                  className={`h-10 rounded-full px-6 text-sm ${view === "signup" ? "bg-primary text-ink shadow-sm hover:bg-primary" : "text-muted hover:text-ink"}`}
                >
                  Sign up
                </Button>
              </div>
            )}

            <form className="flex flex-grow flex-col" onSubmit={(event) => { event.preventDefault(); handleSubmit(); }}>
              <div className="space-y-5">
                {view === "signup" && (
                  <>
                    <ValidatedField
                      icon={UserRound}
                      label="Full Names"
                      placeholder="John Doe"
                      autoComplete="name"
                      value={signupName}
                      onChange={setSignupName}
                      isValid={isValidFullName}
                      errorMessage="Enter your first and last name."
                    />
                    <EmailField label="Email Address" value={signupEmail} onChange={setSignupEmail} />
                    <PhoneField value={signupPhone} onChange={setSignupPhone} />
                    <Field className="gap-1.5">
                      <FieldLabel className="text-sm font-medium text-ink">Where did you hear about us?</FieldLabel>
                      <div className="relative">
                        <Globe2 className="absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted" strokeWidth={1.5} />
                        <Select value={discoverySource} onValueChange={(value) => setDiscoverySource(value ?? "")}>
                          <SelectTrigger className="relative h-11 pl-11 pr-10 text-sm [&>svg]:absolute [&>svg]:right-3.5">
                            <SelectValue>
                              {(value) => discoverySources.find((source) => source.value === value)?.label ?? "Select..."}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>{discoverySources.map((source) => <SelectItem key={source.value} value={source.value}>{source.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </Field>
                  </>
                )}
                {view === "login" && (
                  <div className="space-y-2">
                    <EmailField label="Email Address" value={loginEmail} onChange={setLoginEmail} autoFocus />
                    <p className="text-xs text-muted">No password needed — just your email to log in.</p>
                  </div>
                )}
                {view === "otp" && (
                  <div className="mt-4 space-y-8">
                    <div className="space-y-3">
                      <p className="text-sm font-normal text-ink">Enter the 4-digit code sent to</p>
                      <div className="flex items-center gap-2"><span className="font-semibold text-ink">{verifiedEmail.trim()}</span><Button type="button" variant="ghost" size="icon-xs" onClick={() => switchView(otpSourceView)} className="ml-1 text-muted hover:text-ink" aria-label="Edit email"><Pencil className="size-4 text-muted" /></Button></div>
                    </div>
                    <OtpFields code={otpCode} onChange={setOtpCode} />
                    <p className="mt-2 text-sm text-muted">Didn&apos;t receive code? <Button type="button" variant="link" className="h-auto p-0 text-sm font-medium text-ink hover:underline" onClick={resendOtp}>Resend OTP</Button></p>
                  </div>
                )}
              </div>

              <div className="mt-auto px-0 pb-6 pt-8">
                <Button type="submit" disabled={submitDisabled} className="group relative h-12 w-full rounded-lg px-4 text-base font-semibold disabled:opacity-60">
                  {view === "login" && (submitting ? "Sending..." : "Send Code")}
                  {view === "signup" && (submitting ? "Sending..." : "Create Account")}
                  {view === "otp" && (submitting ? "Verifying..." : "Verify code")}
                  <ArrowRight className="absolute right-4 size-5 -translate-x-3 transition-transform duration-500 group-hover:translate-x-0 group-hover:rotate-360" />
                </Button>
                <p className="mt-4 text-center text-xs text-muted">
                  {view === "otp" ? "It may take a few seconds to arrive, please check your spam if not found in inbox" : "We'll send a one-time code to verify it's you"}
                </p>
              </div>
            </form>
          </div>
        </div>

        <div className="hidden w-1/2 p-4 md:block">
          <div className="relative h-full w-full overflow-hidden rounded-xl shadow-inner">
            <Image src="/showroom.jpg" alt="Luxury Tile Showroom" fill className="object-cover transition-transform duration-700 hover:scale-105" priority sizes="50vw" />
          </div>
        </div>
      </section>
    </main>
  );
}

export default AuthPage;
