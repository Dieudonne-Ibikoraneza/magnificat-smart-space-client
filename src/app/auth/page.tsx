"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent, type ClipboardEvent } from "react";
import {
  ArrowRight,
  Globe2,
  Mail,
  Pencil,
  Phone,
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

type ViewState = "login" | "signup" | "otp";

const discoverySources = [
  { value: "friend", label: "Friend / Referral" },
  { value: "social", label: "Social Media" },
  { value: "search", label: "Search Engine" },
  { value: "advertisement", label: "Advertisement" },
] as const;

const fieldClassName = "h-11 pl-11 text-sm";

function IconField({
  icon: Icon,
  label,
  placeholder,
  type = "text",
}: {
  icon: LucideIcon;
  label: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <Field className="gap-1.5">
      <FieldLabel className="text-sm font-medium text-ink">{label}</FieldLabel>
      <div className="relative">
        <Icon
          aria-hidden="true"
          className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
          strokeWidth={1.5}
        />
        <Input className={fieldClassName} placeholder={placeholder} type={type} />
      </div>
    </Field>
  );
}

function OtpFields() {
  const [code, setCode] = useState(["", "", "", ""]);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const updateCode = (index: number, value: string) => {
    const next = [...code];
    next[index] = value.replace(/\D/g, "").slice(-1);
    setCode(next);
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
    setCode(pasted.padEnd(4, "").split(""));
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
          className="size-14 rounded-xl border-x border-y bg-background text-center text-xl text-ink focus-visible:ring-2 focus-visible:ring-primary"
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

export default function AuthPage() {
  const [view, setView] = useState<ViewState>("login");

  const handleSubmit = () => {
    if (view !== "otp") setView("otp");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fafafa] p-4 font-sans text-ink sm:p-8">
      <section className="flex h-[calc(100vh-2rem)] min-h-150 w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_0_40px_rgba(15,39,71,0.05)] md:h-200 md:max-h-[90vh] md:flex-row">
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
                {view === "login" && <>Enter your email address or phone<br />number to receive the code.</>}
                {view === "signup" && <>Setting up an account takes less<br />than 1 minute.</>}
                {view === "otp" && <>Please enter the 4-digit code sent to<br />your email.</>}
              </p>
            </div>

            {view !== "otp" && (
              <div className="mb-8 flex w-fit shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setView("login")}
                  className={`h-10 rounded-full px-6 text-sm ${view === "login" ? "bg-primary text-ink shadow-sm hover:bg-primary" : "text-muted hover:text-ink"}`}
                >
                  Login
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setView("signup")}
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
                    <IconField icon={UserRound} label="Full Names" placeholder="John Doe" />
                    <IconField icon={Mail} label="Email Address" placeholder="you@example.com" type="email" />
                    <IconField icon={Phone} label="Phone Number" placeholder="+250 780 000 000" type="tel" />
                    <Field className="gap-1.5">
                      <FieldLabel className="text-sm font-medium text-ink">Where did you hear about us?</FieldLabel>
                      <div className="relative">
                        <Globe2 className="absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted" strokeWidth={1.5} />
                        <Select>
                        <SelectTrigger className="h-11 pl-11 pr-10 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>{discoverySources.map((source) => <SelectItem key={source.value} value={source.value}>{source.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </Field>
                  </>
                )}
                {view === "login" && <IconField icon={Mail} label="Email Address / Phone Number" placeholder="Enter your email or phone number" />}
                {view === "otp" && (
                  <div className="mt-4 space-y-8">
                    <div className="space-y-3">
                      <p className="text-sm font-normal text-ink">Enter the 4-digit code sent to</p>
                      <div className="flex items-center gap-2"><span className="font-semibold text-ink">john.doe@example.com</span><button type="button" onClick={() => setView("login")} className="ml-1 text-muted hover:text-ink" aria-label="Edit email"><Pencil className="size-4 text-muted" /></button></div>
                    </div>
                    <OtpFields />
                    <p className="mt-2 text-sm text-muted">Didn&apos;t receive code? <button type="button" className="font-medium text-ink hover:underline">Resend OTP</button></p>
                  </div>
                )}
              </div>

              <div className="mt-auto px-0 pb-6 pt-8">
                <Button type="submit" className="group relative h-12 w-full rounded-lg px-4 text-base font-semibold">
                  {view === "login" && "Send Code"}{view === "signup" && "Create Account"}{view === "otp" && "Verify code"}
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
