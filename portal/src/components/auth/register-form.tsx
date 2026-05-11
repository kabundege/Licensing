"use client";

import { isAxiosError } from "axios";
import { Formik, type FormikHelpers } from "formik";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import routes from "@/constants/routeNames";
import { signupUser } from "@/lib/services/auth.service";
import {
  registerValidationSchema,
  type RegisterBodyDto,
} from "@/validation/register.validation";

type SignupErrorBody = {
  success?: false;
  error?: { message?: string };
};

export function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (
    values: RegisterBodyDto,
    helpers: FormikHelpers<RegisterBodyDto>,
  ) => {
    helpers.setStatus(undefined);
    try {
      await signupUser(values);
      toast.success(`Account created — you can sign in now.`);
      router.push(routes.login.url);
      router.refresh();
    } catch (err) {
      if (isAxiosError<SignupErrorBody>(err)) {
        const msg = err.response?.data?.error?.message ?? err.message;
        helpers.setStatus(
          typeof msg === `string` ? msg : `Could not create account`,
        );
        return;
      }
      helpers.setStatus(`Could not create account`);
    }
  };

  return (
    <Card className="w-full max-w-md border-border bg-card shadow-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold text-foreground">
          Create account
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Register for the BNR Licensing Portal (applicant access by default).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Formik<RegisterBodyDto>
          initialValues={{ name: ``, email: ``, password: `` }}
          validationSchema={registerValidationSchema}
          validateOnBlur
          validateOnChange={false}
          onSubmit={onSubmit}
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            handleSubmit,
            isSubmitting,
            status,
          }) => (
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="grid gap-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={values.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-invalid={Boolean(touched.name && errors.name)}
                />
                {touched.name && errors.name ? (
                  <p className="text-destructive text-sm font-medium">
                    {errors.name}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-invalid={Boolean(touched.email && errors.email)}
                />
                {touched.email && errors.email ? (
                  <p className="text-destructive text-sm font-medium">
                    {errors.email}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="register-password">Password</Label>
                <div className="relative">
                  <Input
                    id="register-password"
                    name="password"
                    type={showPassword ? `text` : `password`}
                    autoComplete="new-password"
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={Boolean(
                      touched.password && errors.password,
                    )}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute end-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? `Hide password` : `Show password`
                    }
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                </div>
                {touched.password && errors.password ? (
                  <p className="text-destructive text-sm font-medium">
                    {errors.password}
                  </p>
                ) : null}
              </div>
              {status ? (
                <p className="text-destructive text-sm font-medium">{status}</p>
              ) : null}
              <Button
                className="w-full"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? `Creating account…` : `Create account`}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already registered?{" "}
                <Link
                  href={routes.login.url}
                  className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
                >
                  {routes.login.label}
                </Link>
              </p>
            </form>
          )}
        </Formik>
      </CardContent>
    </Card>
  );
}
