import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus } from "@/lib/application-domain";
import {
  applicationStatusBadgeClassName,
  applicationStatusLabel,
} from "@/lib/application-domain";

export function ApplicationStatusBadge({
  status,
}: {
  status: ApplicationStatus;
}) {
  return (
    <Badge
      variant="outline"
      className={applicationStatusBadgeClassName(status)}
    >
      {applicationStatusLabel(status)}
    </Badge>
  );
}
