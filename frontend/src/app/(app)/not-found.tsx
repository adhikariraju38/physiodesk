import { ErrorState } from "@/components/ui/ErrorState";

export default function AppNotFound() {
  return (
    <ErrorState
      title="Not found"
      message="That record does not exist, or it has been removed since the link was made."
      homeHref="/dashboard"
    />
  );
}
