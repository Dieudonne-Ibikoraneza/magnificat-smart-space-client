"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ClipboardEvent,
} from "react";
import { useTranslation } from "react-i18next";
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
import {
  authApi,
  usersApi,
  type DiscoverySource,
  type HearAboutUs,
} from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/lib/api/use-api";
import { isPathAllowedForRole, safeInternalPath, roleHomePath } from "@/lib/auth-routes";
import { useCart } from "@/lib/cart-store";
import { useCurrentUser } from "@/lib/current-user";
import {
  isValidEmail,
  isValidFullName,
  isValidRwandaMobileDigits,
} from "@/lib/validation";
import type { Role } from "@/lib/api/types";
import { PhoneField, RWANDA_PREFIX } from "@/components/phone-field";

/** Matches the server's default `OTP_RESEND_COOLDOWN_SECONDS` — see server/.env. */
const RESEND_COOLDOWN_SECONDS = 60;

/** Server messages are shown as-is; anything else (a dropped connection) gets a generic fallback. */
const errorMessage = (cause: unknown, fallback: string) =>
  cause instanceof ApiError ? cause.message : fallback;

const authErrorMessage = (
  cause: unknown,
  fallback: string,
  cooldownMessage: string,
) =>
  cause instanceof ApiError && cause.status === 429
    ? cooldownMessage
    : errorMessage(cause, fallback);

type ViewState = "login" | "signup" | "otp";

/**
 * Used only until `GET /auth/discovery-sources` responds. The server owns the
 * canonical list (its values are what `POST /auth/register` accepts), so these
 * are the same enum values, not a second source of truth.
 */
const fallbackDiscoverySources: DiscoverySource[] = [
  { value: "REFERRAL", label: "Referral" },
  { value: "SOCIAL_MEDIA", label: "Social Media" },
  { value: "SEARCH_ENGINE", label: "Search Engine" },
  { value: "ADVERTISEMENT", label: "Advertisement" },
  { value: "OTHER", label: "Other" },
];

/**
 * Translation keys for the known discovery-source values. Anything the
 * server sends that isn't in here falls back to the server's own label.
 */
const DISCOVERY_SOURCE_KEYS = {
  REFERRAL: "auth.discoverySources.REFERRAL",
  SOCIAL_MEDIA: "auth.discoverySources.SOCIAL_MEDIA",
  SEARCH_ENGINE: "auth.discoverySources.SEARCH_ENGINE",
  ADVERTISEMENT: "auth.discoverySources.ADVERTISEMENT",
  OTHER: "auth.discoverySources.OTHER",
} as const;

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
      {showError && (
        <p className="text-xs font-medium text-red-600">{errorMessage}</p>
      )}
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
}) => {
  const { t } = useTranslation();
  return (
    <ValidatedField
      icon={Mail}
      label={label}
      placeholder={t("auth.fields.emailPlaceholder")}
      type="email"
      autoComplete="email"
      autoFocus={autoFocus}
      value={value}
      onChange={onChange}
      isValid={isValidEmail}
      errorMessage={t("auth.fields.emailError")}
    />
  );
};

const OtpFields = ({
  code,
  onChange,
}: {
  code: string[];
  onChange: (code: string[]) => void;
}) => {
  const { t } = useTranslation();
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  // This field only ever mounts once the OTP step is reached (see its
  // `view === "otp" &&` guard below), so a mount-time focus is exactly
  // "the first box is active the moment the code screen appears" — no need
  // to track view changes here at all.
  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const updateCode = (index: number, value: string) => {
    const next = [...code];
    next[index] = value.replace(/\D/g, "").slice(-1);
    onChange(next);
    if (next[index] && index < 3) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 4);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted.padEnd(4, "").split(""));
    refs.current[Math.min(pasted.length, 4) - 1]?.focus();
  };

  return (
    <div className="flex gap-3" aria-label={t("auth.otp.codeGroupLabel")}>
      {code.map((value, index) => (
        <Input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          aria-label={t("auth.otp.digitLabel", { index: index + 1 })}
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
};

const AuthPage = () => {
  const { t } = useTranslation();
  const [view, setView] = useState<ViewState>("login");
  const [discoverySource, setDiscoverySource] = useState("");
  // The list of options is public, so it loads without a session.
  const { data: fetchedDiscoverySources } = useApi(() =>
    authApi.discoverySources(),
  );
  const discoverySources = fetchedDiscoverySources ?? fallbackDiscoverySources;
  const discoveryLabel = (source: DiscoverySource): string => {
    const key =
      DISCOVERY_SOURCE_KEYS[source.value as keyof typeof DISCOVERY_SOURCE_KEYS];
    return key ? t(key) : source.label;
  };
  const [loginEmail, setLoginEmail] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [otpCode, setOtpCode] = useState(["", "", "", ""]);
  const [otpSourceView, setOtpSourceView] = useState<"login" | "signup">(
    "login",
  );
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh: refreshCurrentUser } = useCurrentUser();
  const { refresh: refreshCart } = useCart();

  // Where to send a `role` once signed in: back to the route they were
  // trying to reach (`?next=`, set by `useRequireRole` when it bounced them
  // here) if that role is actually allowed there, otherwise their own
  // dashboard home — a sales person can't use a stock-manager `next` link
  // just because they had it in the URL.
  const destinationFor = useCallback(
    (role: Role): string => {
      const next = safeInternalPath(searchParams.get("next"));
      if (next && isPathAllowedForRole(next, role)) return next;
      return roleHomePath(role);
    },
    [searchParams],
  );

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(
      () => setResendCooldown((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

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
    setResendCooldown(0);
  };

  const handleSubmit = async () => {
    if (view === "login") {
      if (!loginEmailValid) {
        toast.error(t("auth.toast.invalidEmailTitle"), {
          description: t("auth.toast.invalidEmailBody"),
        });
        return;
      }
      setSubmitting(true);
      try {
        await authApi.login(loginEmail.trim());
        toast.success(t("auth.toast.codeSentTitle"), {
          description: t("auth.toast.codeSentBody", {
            email: loginEmail.trim(),
          }),
        });
        setOtpSourceView("login");
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        setView("otp");
      } catch (cause) {
        toast.error(t("auth.toast.codeSendFailedTitle"), {
          description: authErrorMessage(
            cause,
            t("auth.toast.tryAgain"),
            t("auth.toast.cooldownBody"),
          ),
        });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (view === "signup") {
      if (!signupValid) {
        toast.error(t("auth.toast.checkFieldsTitle"), {
          description: t("auth.toast.checkFieldsBody"),
        });
        return;
      }
      setSubmitting(true);
      try {
        await authApi.register({
          fullName: signupName.trim(),
          email: signupEmail.trim(),
          phone: `${RWANDA_PREFIX}${signupPhone}`,
          heardAboutUs: discoverySource as HearAboutUs,
        });
        toast.success(t("auth.toast.codeSentTitle"), {
          description: t("auth.toast.codeSentBody", {
            email: signupEmail.trim(),
          }),
        });
        setOtpSourceView("signup");
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        setView("otp");
      } catch (cause) {
        toast.error(t("auth.toast.accountFailedTitle"), {
          description: authErrorMessage(
            cause,
            t("auth.toast.tryAgain"),
            t("auth.toast.cooldownBody"),
          ),
        });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!otpComplete) {
      toast.error(t("auth.toast.incompleteCodeTitle"), {
        description: t("auth.toast.incompleteCodeBody"),
      });
      return;
    }

    setSubmitting(true);
    try {
      await authApi.verifyOtp(verifiedEmail.trim(), otpCode.join(""));
      const user = await usersApi.me();
      // Refreshes the shared session and cart so the destination's sidebar,
      // header cart count etc. show this user immediately, rather than only
      // on their next navigation.
      refreshCurrentUser();
      refreshCart();
      toast.success(t("auth.toast.successTitle"), {
        description: t("auth.toast.successBody"),
      });
      router.push(destinationFor(user.role));
    } catch (cause) {
      toast.error(t("auth.toast.verifyFailedTitle"), {
        description: errorMessage(cause, t("auth.toast.tryAgain")),
      });
      setOtpCode(["", "", "", ""]);
    } finally {
      setSubmitting(false);
    }
  };

  const resendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      await authApi.resendOtp(verifiedEmail.trim());
      setOtpCode(["", "", "", ""]);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      toast.info(t("auth.toast.codeResentTitle"), {
        description: t("auth.toast.codeResentBody", {
          email: verifiedEmail.trim(),
        }),
      });
    } catch (cause) {
      toast.error(t("auth.toast.resendFailedTitle"), {
        description: authErrorMessage(
          cause,
          t("auth.toast.tryAgain"),
          t("auth.toast.cooldownBody"),
        ),
      });
    }
  };

  const submitDisabled =
    submitting ||
    (view === "login" && !loginEmailValid) ||
    (view === "signup" && !signupValid) ||
    (view === "otp" && !otpComplete);

  const title =
    view === "login"
      ? t("auth.login.title")
      : view === "signup"
        ? t("auth.signup.title")
        : t("auth.otp.title");
  const subtitle =
    view === "login"
      ? t("auth.login.subtitle")
      : view === "signup"
        ? t("auth.signup.subtitle")
        : t("auth.otp.subtitle");
  const submitLabel =
    view === "login"
      ? submitting
        ? t("auth.login.submitting")
        : t("auth.login.submit")
      : view === "signup"
        ? submitting
          ? t("auth.signup.submitting")
          : t("auth.signup.submit")
        : submitting
          ? t("auth.otp.submitting")
          : t("auth.otp.submit");

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted-background p-4 font-sans text-ink sm:p-8">
      <section className="flex h-[calc(100vh-2rem)] min-h-150 w-full max-w-5xl flex-col overflow-hidden rounded-2xl  bg-white shadow-[0_0_40px_rgba(15,39,71,0.05)] md:h-200 md:max-h-[90vh] md:flex-row">
        <div className="scrollbar-hide flex w-full flex-col overflow-y-auto md:w-1/2">
          <div className="flex min-h-full flex-col p-8 md:p-12 lg:p-16">
            <div className="mb-4 flex w-full justify-center">
              <Image
                src="/images/logo.png"
                alt={t("auth.logoAlt")}
                width={140}
                height={140}
                className="object-contain"
                priority
              />
            </div>

            <div className="mb-8 mt-auto">
              <h1 className="mb-2 text-2xl font-bold tracking-tight text-ink md:text-3xl">
                {title}
              </h1>
              <p className="min-h-10 text-sm leading-5 text-muted">
                {subtitle}
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
                  {t("auth.tabs.login")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => switchView("signup")}
                  className={`h-10 rounded-full px-6 text-sm ${view === "signup" ? "bg-primary text-ink shadow-sm hover:bg-primary" : "text-muted hover:text-ink"}`}
                >
                  {t("auth.tabs.signup")}
                </Button>
              </div>
            )}

            <form
              className="flex grow flex-col"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
            >
              <div className="space-y-5">
                {view === "signup" && (
                  <>
                    <ValidatedField
                      icon={UserRound}
                      label={t("auth.fields.fullName")}
                      placeholder={t("auth.fields.fullNamePlaceholder")}
                      autoComplete="name"
                      value={signupName}
                      onChange={setSignupName}
                      isValid={isValidFullName}
                      errorMessage={t("auth.fields.fullNameError")}
                    />
                    <EmailField
                      label={t("auth.fields.email")}
                      value={signupEmail}
                      onChange={setSignupEmail}
                    />
                    <PhoneField
                      label={t("auth.fields.phoneNumber")}
                      value={signupPhone}
                      onChange={setSignupPhone}
                    />
                    <Field className="gap-1.5">
                      <FieldLabel className="text-sm font-medium text-ink">
                        {t("auth.fields.discovery")}
                      </FieldLabel>
                      <div className="relative">
                        <Globe2
                          className="absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted"
                          strokeWidth={1.5}
                        />
                        <Select
                          value={discoverySource}
                          onValueChange={(value) =>
                            setDiscoverySource(value ?? "")
                          }
                        >
                          <SelectTrigger className="relative h-11 pl-11 pr-10 text-sm [&>svg]:absolute [&>svg]:right-3.5">
                            <SelectValue>
                              {(value) => {
                                const source = discoverySources.find(
                                  (item) => item.value === value,
                                );
                                return source
                                  ? discoveryLabel(source)
                                  : t("auth.fields.discoveryPlaceholder");
                              }}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {discoverySources.map((source) => (
                              <SelectItem
                                key={source.value}
                                value={source.value}
                              >
                                {discoveryLabel(source)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </Field>
                  </>
                )}
                {view === "login" && (
                  <div className="space-y-2">
                    <EmailField
                      label={t("auth.fields.email")}
                      value={loginEmail}
                      onChange={setLoginEmail}
                      autoFocus
                    />
                    <p className="text-xs text-muted">
                      {t("auth.login.emailHint")}
                    </p>
                  </div>
                )}
                {view === "otp" && (
                  <div className="mt-4 space-y-8">
                    <div className="space-y-3">
                      <p className="text-sm font-normal text-ink">
                        {t("auth.otp.sentTo")}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink">
                          {verifiedEmail.trim()}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => switchView(otpSourceView)}
                          className="ml-1 text-muted hover:text-ink"
                          aria-label={t("auth.otp.editEmail")}
                        >
                          <Pencil className="size-4 text-muted" />
                        </Button>
                      </div>
                    </div>
                    <OtpFields code={otpCode} onChange={setOtpCode} />
                    <p className="mt-2 text-sm text-muted">
                      {t("auth.otp.noCode")}{" "}
                      <Button
                        type="button"
                        variant="link"
                        disabled={resendCooldown > 0}
                        className="h-auto p-0 text-sm font-medium text-ink hover:underline disabled:no-underline disabled:opacity-60"
                        onClick={() => void resendOtp()}
                      >
                        {resendCooldown > 0
                          ? t("auth.otp.resendIn", { seconds: resendCooldown })
                          : t("auth.otp.resend")}
                      </Button>
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-auto px-0 pb-6 pt-8">
                <Button
                  type="submit"
                  disabled={submitDisabled}
                  className="group relative h-12 w-full rounded-lg px-4 text-base font-semibold disabled:opacity-60"
                >
                  {submitLabel}
                  <ArrowRight className="absolute right-4 size-5 -translate-x-3 transition-transform duration-500 group-hover:translate-x-0 group-hover:rotate-360" />
                </Button>
                <p className="mt-4 text-center text-xs text-muted">
                  {view === "otp"
                    ? t("auth.footer.otp")
                    : t("auth.footer.default")}
                </p>
              </div>
            </form>
          </div>
        </div>

        <div className="hidden w-1/2 p-4 md:block">
          <div className="relative h-full w-full overflow-hidden rounded-xl shadow-inner">
            <Image
              src="/showroom.jpg"
              alt={t("auth.showroomAlt")}
              fill
              className="object-cover transition-transform duration-700 hover:scale-105"
              priority
              sizes="50vw"
            />
          </div>
        </div>
      </section>
    </main>
  );
};

export default AuthPage;
