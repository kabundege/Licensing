"use client";

import { Formik, type FormikHelpers } from "formik";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

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
import {
  loginValidationSchema,
  type LoginBodyDto,
} from "@/validation/auth.validation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get(`callbackUrl`) ?? routes.dashboard.url;
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (
    values: LoginBodyDto,
    helpers: FormikHelpers<LoginBodyDto>,
  ) => {
    const res = await signIn(`credentials`, {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (res?.error) {
      helpers.setStatus(`Invalid email or password`);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <Card className="w-full max-w-md border-border bg-card shadow-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold text-foreground">
          Sign in
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          BNR Licensing Portal — use your registered account credentials.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Formik<LoginBodyDto>
          initialValues={{ email: ``, password: `` }}
          validationSchema={loginValidationSchema}
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
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@organization.gov.rw"
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
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? `text` : `password`}
                    autoComplete="current-password"
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={Boolean(touched.password && errors.password)}
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
                {isSubmitting ? `Signing in…` : `Sign in`}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  href={routes.register.url}
                  className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
                >
                  {routes.register.label}
                </Link>
              </p>
            </form>
          )}
        </Formik>
      </CardContent>
    </Card>
  );
}
