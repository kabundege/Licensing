"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import routes from "@/constants/routeNames";
import { useCreateApplicationMutation } from "@/hooks/use-applications";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function NewApplicationClient() {
  const router = useRouter();
  const createMutation = useCreateApplicationMutation();

  const onCreate = async () => {
    try {
      const app = await createMutation.mutateAsync();
      toast.success(`Draft created — you can add documents before submitting.`);
      router.push(`${routes.applications.url}/${app.id}`);
      router.refresh();
    } catch {
      /* toast handled in mutation */
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          New application
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Start an empty licensing case in{" "}
          <span className="font-medium text-foreground">Draft</span>. Upload
          documents from the case screen, then submit when ready.
        </p>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle>Create draft</CardTitle>
          <CardDescription className="text-muted-foreground">
            Calls{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
              POST /api/applications
            </code>
            {" "}— no intake payload yet; the API binds the record to your signed-in
            account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={createMutation.isPending}
            onClick={() => void onCreate()}
          >
            {createMutation.isPending ? `Creating…` : `Start draft application`}
          </Button>
          <Link
            href={routes.applications.url}
            className={cn(buttonVariants({ variant: `outline` }))}
          >
            Cancel
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
